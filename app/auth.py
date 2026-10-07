from flask import Blueprint,render_template,request,redirect,url_for,flash
from flask_login import login_user,logout_user,current_user
from werkzeug.security import check_password_hash,generate_password_hash
from .models import db,User
bp=Blueprint('auth',__name__)
@bp.route('/login',methods=['GET','POST'])
def login():
    if current_user.is_authenticated:return redirect(url_for('main.dashboard'))
    if request.method=='POST':
        email=request.form.get('email','').strip().lower(); password=request.form.get('password','')
        user=User.query.filter_by(email=email).first()
        if user and user.active and check_password_hash(user.password_hash,password): login_user(user,remember=True); return redirect(url_for('main.dashboard'))
        flash('Invalid email, password, or inactive account.','error')
    return render_template('login.html')
@bp.route('/register',methods=['GET','POST'])
def register():
    if current_user.is_authenticated:return redirect(url_for('main.dashboard'))
    if request.method=='POST':
        name=request.form.get('name','').strip(); email=request.form.get('email','').strip().lower(); password=request.form.get('password','')
        if not name or len(password)<8: flash('Use a name and password of at least 8 characters.','error')
        elif User.query.filter_by(email=email).first(): flash('An account with that email already exists.','error')
        else:
            u=User(name=name,email=email,password_hash=generate_password_hash(password)); db.session.add(u); db.session.commit(); login_user(u); return redirect(url_for('main.dashboard'))
    return render_template('register.html')
@bp.route('/logout')
def logout(): logout_user(); return redirect(url_for('auth.login'))
