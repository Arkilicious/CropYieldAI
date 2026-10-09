import os
import uuid
from functools import wraps

from flask import (
    Blueprint, current_app, flash, redirect, render_template,
    request, url_for
)
from flask_login import current_user, login_required
from sqlalchemy import or_
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

from .models import db, User

bp = Blueprint("accounts", __name__)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_PHOTO_BYTES = 3 * 1024 * 1024


def admin_only(view):
    @wraps(view)
    @login_required
    def wrapped(*args, **kwargs):
        if current_user.role != "admin":
            return ("Forbidden", 403)
        return view(*args, **kwargs)
    return wrapped


def save_profile_photo(upload):
    if not upload or not upload.filename:
        return None

    original = secure_filename(upload.filename)
    if "." not in original:
        raise ValueError("Choose a JPG, PNG, or WebP image.")

    extension = original.rsplit(".", 1)[1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError("Profile photos must be JPG, PNG, or WebP.")

    upload.stream.seek(0, os.SEEK_END)
    size = upload.stream.tell()
    upload.stream.seek(0)

    if size <= 0 or size > MAX_PHOTO_BYTES:
        raise ValueError("Choose an image smaller than 3 MB.")

    # Check common image signatures instead of trusting the file extension.
    header = upload.stream.read(16)
    upload.stream.seek(0)
    valid = (
        header.startswith(b"\xff\xd8\xff") if extension in {"jpg", "jpeg"}
        else header.startswith(b"\x89PNG\r\n\x1a\n") if extension == "png"
        else header.startswith(b"RIFF") and header[8:12] == b"WEBP"
    )
    if not valid:
        raise ValueError("The uploaded file is not a valid image of that type.")

    folder = os.path.join(
        current_app.static_folder, "uploads", "profiles"
    )
    os.makedirs(folder, exist_ok=True)

    filename = f"{uuid.uuid4().hex}.{extension}"
    upload.save(os.path.join(folder, filename))
    return f"uploads/profiles/{filename}"


def remove_old_photo(relative_path):
    if not relative_path or not relative_path.startswith("uploads/profiles/"):
        return
    path = os.path.join(current_app.static_folder, relative_path)
    try:
        if os.path.isfile(path):
            os.remove(path)
    except OSError:
        current_app.logger.warning("Could not remove old profile photo.")


def apply_profile_changes(user, form, photo_upload=None):
    name = form.get("name", "").strip()
    email = form.get("email", "").strip().lower()
    phone = form.get("phone", "").strip()
    location = form.get("location", "").strip()
    bio = form.get("bio", "").strip()

    if not name:
        raise ValueError("Full name is required.")
    if len(name) > 120:
        raise ValueError("Name must be 120 characters or fewer.")
    if not email or len(email) > 160 or "@" not in email:
        raise ValueError("Enter a valid email address.")
    if len(phone) > 40 or len(location) > 160 or len(bio) > 500:
        raise ValueError("One or more profile fields exceed their limits.")

    duplicate = User.query.filter(
        User.email == email, User.id != user.id
    ).first()
    if duplicate:
        raise ValueError("That email address is already in use.")

    user.name = name
    user.email = email
    user.phone = phone or None
    user.location = location or None
    user.bio = bio or None

    if photo_upload and photo_upload.filename:
        new_photo = save_profile_photo(photo_upload)
        old_photo = user.profile_photo
        user.profile_photo = new_photo
        if old_photo:
            # Delete only after the database transaction succeeds.
            db.session.info.setdefault("photos_to_remove", []).append(old_photo)


@bp.route("/profile", methods=["GET", "POST"])
@login_required
def profile():
    if request.method == "POST":
        try:
            apply_profile_changes(
                current_user,
                request.form,
                request.files.get("profile_photo")
            )

            new_password = request.form.get("new_password", "")
            confirm_password = request.form.get("confirm_password", "")
            current_password = request.form.get("current_password", "")

            if new_password:
                if not check_password_hash(
                    current_user.password_hash, current_password
                ):
                    raise ValueError("Your current password is incorrect.")
                if len(new_password) < 8:
                    raise ValueError("New password must be at least 8 characters.")
                if new_password != confirm_password:
                    raise ValueError("The new passwords do not match.")
                current_user.password_hash = generate_password_hash(new_password)

            photos_to_remove = list(
                db.session.info.get("photos_to_remove", [])
            )
            db.session.commit()
            db.session.info.pop("photos_to_remove", None)
            for old_photo in photos_to_remove:
                remove_old_photo(old_photo)

            flash("Your profile has been updated.", "success")
            return redirect(url_for("accounts.profile"))
        except ValueError as exc:
            db.session.rollback()
            db.session.info.pop("photos_to_remove", None)
            flash(str(exc), "error")
        except Exception:
            db.session.rollback()
            db.session.info.pop("photos_to_remove", None)
            current_app.logger.exception("Profile update failed.")
            flash("Profile update failed. Please try again.", "error")

    return render_template("profile.html")


@bp.route("/admin/user/new", methods=["GET", "POST"])
@admin_only
def create_user():
    if request.method == "POST":
        try:
            name = request.form.get("name", "").strip()
            email = request.form.get("email", "").strip().lower()
            password = request.form.get("password", "")
            role = request.form.get("role", "user")
            active = request.form.get("active") == "on"

            if not name or not email or len(password) < 8:
                raise ValueError(
                    "Name, email, and a password of at least 8 characters are required."
                )
            if role not in {"user", "admin"}:
                raise ValueError("Select a valid account role.")
            if User.query.filter_by(email=email).first():
                raise ValueError("An account with that email already exists.")

            user = User(
                name=name,
                email=email,
                password_hash=generate_password_hash(password),
                role=role,
                active=active,
                phone=request.form.get("phone", "").strip() or None,
                location=request.form.get("location", "").strip() or None,
                bio=request.form.get("bio", "").strip() or None
            )

            photo = request.files.get("profile_photo")
            if photo and photo.filename:
                user.profile_photo = save_profile_photo(photo)

            db.session.add(user)
            db.session.commit()
            flash("User account created successfully.", "success")
            return redirect(url_for("main.admin", _anchor="users"))
        except ValueError as exc:
            db.session.rollback()
            flash(str(exc), "error")
        except Exception:
            db.session.rollback()
            current_app.logger.exception("User creation failed.")
            flash("Could not create the account. Please try again.", "error")

    return render_template("user_form.html", user=None, creating=True)


@bp.route("/admin/user/<int:uid>/edit", methods=["GET", "POST"])
@admin_only
def edit_user(uid):
    user = User.query.get_or_404(uid)

    if request.method == "POST":
        try:
            apply_profile_changes(
                user, request.form, request.files.get("profile_photo")
            )

            new_role = request.form.get("role", user.role)
            if new_role not in {"user", "admin"}:
                raise ValueError("Select a valid account role.")

            new_active = request.form.get("active") == "on"

            # Do not allow an admin to remove their own admin access here.
            if user.id == current_user.id and (
                new_role != "admin" or not new_active
            ):
                raise ValueError(
                    "You cannot remove your own administrator role or deactivate your own account."
                )

            if user.role == "admin" and (
                new_role != "admin" or not new_active
            ):
                other_admins = User.query.filter(
                    User.role == "admin",
                    User.active.is_(True),
                    User.id != user.id
                ).count()
                if other_admins == 0:
                    raise ValueError(
                        "You cannot deactivate or demote the last active administrator."
                    )

            user.role = new_role
            user.active = new_active

            new_password = request.form.get("password", "")
            if new_password:
                if len(new_password) < 8:
                    raise ValueError("Password must be at least 8 characters.")
                user.password_hash = generate_password_hash(new_password)

            photos_to_remove = list(
                db.session.info.get("photos_to_remove", [])
            )
            db.session.commit()
            db.session.info.pop("photos_to_remove", None)
            for old_photo in photos_to_remove:
                remove_old_photo(old_photo)

            flash("User profile updated successfully.", "success")
            return redirect(url_for("main.admin", _anchor="users"))
        except ValueError as exc:
            db.session.rollback()
            db.session.info.pop("photos_to_remove", None)
            flash(str(exc), "error")
        except Exception:
            db.session.rollback()
            db.session.info.pop("photos_to_remove", None)
            current_app.logger.exception("User update failed.")
            flash("Could not update the account. Please try again.", "error")

    return render_template("user_form.html", user=user, creating=False)


@bp.route("/admin/user/<int:uid>/delete", methods=["POST"])
@admin_only
def delete_user(uid):
    user = User.query.get_or_404(uid)

    if user.id == current_user.id:
        flash("You cannot delete your own account.", "error")
        return redirect(url_for("main.admin", _anchor="users"))

    if user.role == "admin" and user.active:
        other_admins = User.query.filter(
            User.role == "admin",
            User.active.is_(True),
            User.id != user.id
        ).count()
        if other_admins == 0:
            flash("You cannot delete the last active administrator.", "error")
            return redirect(url_for("main.admin", _anchor="users"))

    photo = user.profile_photo
    try:
        db.session.delete(user)
        db.session.commit()
        remove_old_photo(photo)
        flash("User account and associated prediction history deleted.", "success")
    except Exception:
        db.session.rollback()
        current_app.logger.exception("User deletion failed.")
        flash("Could not delete the account.", "error")

    return redirect(url_for("main.admin", _anchor="users"))
