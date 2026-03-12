"""
Registry of trained models for prediction (path, name, metadata).
"""
from datetime import datetime

from app.extensions import db


class TrainedModel(db.Model):
    __tablename__ = "trained_models"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False, index=True)
    path = db.Column(db.String(512), nullable=False)  # directory on disk
    is_default = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    metadata_ = db.Column("metadata", db.JSON, nullable=True)  # metrics, etc.
