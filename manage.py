from app import create_app
from app.models import db
from ml.train import train_and_save

app = create_app()
with app.app_context():
    db.create_all()
    train_and_save()
    print('Database initialized and model trained.')
