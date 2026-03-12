"""
Seed permissions, default admin role and user if DB is empty.
"""
import os
from pathlib import Path

from app.extensions import db
from app.models.user import User, Role, Permission
from app.models.trained_model import TrainedModel


PERMISSION_NAMES = [
    "extract.run", "train.run", "predict.use",
    "api_key.manage", "user.manage", "role.manage", "usage.view", "config.manage",
]


def seed_if_empty():
    if Permission.query.first() is not None:
        pass
    else:
        for pname in PERMISSION_NAMES:
            db.session.add(Permission(name=pname))
        db.session.commit()
        admin = Role(name="admin", description="Administrator")
        admin.permissions = Permission.query.all()
        db.session.add(admin)
        db.session.commit()
        if User.query.first() is None:
            user = User(email="admin@drgbr.local", name="Admin")
            user.set_password("admin123")
            user.roles = [admin]
            db.session.add(user)
            db.session.commit()
    if TrainedModel.query.first() is None:
        root = Path(__file__).resolve().parent.parent
        default_path = root / "models"
        if default_path.is_dir():
            db.session.add(TrainedModel(name="default", path=str(default_path), is_default=True))
            db.session.commit()
