from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin

db=SQLAlchemy()
class User(UserMixin,db.Model):
    id=db.Column(db.Integer,primary_key=True); name=db.Column(db.String(120),nullable=False); email=db.Column(db.String(160),unique=True,nullable=False); password_hash=db.Column(db.String(255),nullable=False); role=db.Column(db.String(20),default='user'); active=db.Column(db.Boolean,default=True); created_at=db.Column(db.DateTime,default=datetime.utcnow)
    predictions=db.relationship('Prediction',backref='user',lazy=True,cascade='all, delete-orphan')
class Prediction(db.Model):
    id=db.Column(db.Integer,primary_key=True); user_id=db.Column(db.Integer,db.ForeignKey('user.id'),nullable=False); crop_type=db.Column(db.String(50),nullable=False); soil_type=db.Column(db.String(50),nullable=False); rainfall=db.Column(db.Float,nullable=False); temperature=db.Column(db.Float,nullable=False); humidity=db.Column(db.Float,nullable=False); yield_tph=db.Column(db.Float,nullable=False); range_low=db.Column(db.Float); range_high=db.Column(db.Float); risk_score=db.Column(db.Integer); risk_label=db.Column(db.String(20)); condition_score=db.Column(db.Integer); recommendations=db.Column(db.Text); created_at=db.Column(db.DateTime,default=datetime.utcnow)
