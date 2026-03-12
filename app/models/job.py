"""
Extraction and training jobs (history/status).
"""
from datetime import datetime

from app.extensions import db


class ExtractionJob(db.Model):
    __tablename__ = "extraction_jobs"
    id = db.Column(db.Integer, primary_key=True)
    status = db.Column(db.String(32), nullable=False, default="pending")  # pending, running, success, failed
    sources = db.Column(db.JSON, nullable=True)  # e.g. ["sih", "cid10", "sigtap"]
    params = db.Column(db.JSON, nullable=True)  # states, years, etc.
    started_at = db.Column(db.DateTime, nullable=True)
    finished_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    message = db.Column(db.Text, nullable=True)


class TrainingJob(db.Model):
    __tablename__ = "training_jobs"
    id = db.Column(db.Integer, primary_key=True)
    status = db.Column(db.String(32), nullable=False, default="pending")
    params = db.Column(db.JSON, nullable=True)  # limit, epochs, etc.
    model_id = db.Column(db.Integer, db.ForeignKey("trained_models.id", ondelete="SET NULL"), nullable=True)
    started_at = db.Column(db.DateTime, nullable=True)
    finished_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    message = db.Column(db.Text, nullable=True)
