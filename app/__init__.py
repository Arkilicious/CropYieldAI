import os

from flask import Flask
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect

from .models import db, User


def create_app():
    app = Flask(__name__, instance_relative_config=True)

    # Make sure the Flask instance directory exists
    os.makedirs(app.instance_path, exist_ok=True)

    # Database configuration
    database_url = os.getenv(
        "DATABASE_URL",
        "sqlite:///cropyield.db"
    )

    # Render/PostgreSQL compatibility
    if database_url.startswith("postgres://"):
        database_url = database_url.replace(
            "postgres://",
            "postgresql://",
            1
        )

    # Explicitly use psycopg2, which is installed in requirements.txt
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace(
            "postgresql://",
            "postgresql+psycopg2://",
            1
        )

    app.config.update(
        SECRET_KEY=os.getenv(
            "SECRET_KEY",
            "dev-secret-change-me"
        ),
        SQLALCHEMY_DATABASE_URI=database_url,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        MAX_CONTENT_LENGTH=3 * 1024 * 1024 + 256 * 1024,
    )

    # Initialize database
    db.init_app(app)

    # CSRF protection
    csrf = CSRFProtect(app)

    # Login manager
    login = LoginManager(app)
    login.login_view = "auth.login"

    @login.user_loader
    def load_user(uid):
        return db.session.get(User, int(uid))

    # Register blueprints
    from .auth import bp as auth_bp
    from .main import bp as main_bp
    from .accounts import bp as accounts_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(accounts_bp)

    # Create database tables and seed default users
    with app.app_context():
        db.create_all()
        upgrade_user_profile_columns()
        seed()

    return app


def seed():
    from werkzeug.security import generate_password_hash
    from .models import User

    # Create admin user if it doesn't exist
    if not User.query.filter_by(
        email="admin@cropyield.ai"
    ).first():
        db.session.add(
            User(
                name="System Administrator",
                email="admin@cropyield.ai",
                password_hash=generate_password_hash(
                    "Admin@12345"
                ),
                role="admin"
            )
        )

    # Create demo user if it doesn't exist
    if not User.query.filter_by(
        email="demo@cropyield.ai"
    ).first():
        db.session.add(
            User(
                name="Demo Farmer",
                email="demo@cropyield.ai",
                password_hash=generate_password_hash(
                    "Demo@12345"
                ),
                role="user"
            )
        )

    db.session.commit()

def upgrade_user_profile_columns():
    """Add profile fields to existing SQLite/PostgreSQL user tables."""
    from sqlalchemy import inspect, text

    inspector = inspect(db.engine)
    if "user" not in inspector.get_table_names():
        return

    existing = {column["name"] for column in inspector.get_columns("user")}
    additions = {
        "phone": "VARCHAR(40)",
        "location": "VARCHAR(160)",
        "bio": "VARCHAR(500)",
        "profile_photo": "VARCHAR(255)"
    }

    with db.engine.begin() as connection:
        for column, sql_type in additions.items():
            if column not in existing:
                connection.execute(
                    text(f'ALTER TABLE "user" ADD COLUMN "{column}" {sql_type}')
                )
