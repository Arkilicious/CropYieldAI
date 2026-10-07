import os
from flask import Flask
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect
from .models import db, User


def create_app():
    app = Flask(__name__, instance_relative_config=True)

    os.makedirs(app.instance_path, exist_ok=True)

    database_url = os.getenv(
        'DATABASE_URL',
        'sqlite:///cropyield.db'
    )

    if database_url.startswith('postgres://'):
        database_url = database_url.replace(
            'postgres://',
            'postgresql://',
            1
        )

    app.config.update(
        SECRET_KEY=os.getenv(
            'SECRET_KEY',
            'dev-secret-change-me'
        ),
        SQLALCHEMY_DATABASE_URI=database_url,
        SQLALCHEMY_TRACK_MODIFICATIONS=False
    )

    db.init_app(app)

    csrf = CSRFProtect(app)

    login = LoginManager(app)
    login.login_view = 'auth.login'

    @login.user_loader
    def load_user(uid):
        return db.session.get(User, int(uid))

    from .auth import bp as auth_bp
    from .main import bp as main_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)

    with app.app_context():
        db.create_all()
        seed()

    return app


def seed():
    from werkzeug.security import generate_password_hash
    from .models import User

    if not User.query.filter_by(
        email='admin@cropyield.ai'
    ).first():
        db.session.add(
            User(
                name='System Administrator',
                email='admin@cropyield.ai',
                password_hash=generate_password_hash('Admin@12345'),
                role='admin'
            )
        )

    if not User.query.filter_by(
        email='demo@cropyield.ai'
    ).first():
        db.session.add(
            User(
                name='Demo Farmer',
                email='demo@cropyield.ai',
                password_hash=generate_password_hash('Demo@12345'),
                role='user'
            )
        )

    db.session.commit()