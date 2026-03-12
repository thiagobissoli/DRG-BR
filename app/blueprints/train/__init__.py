"""
Orchestrate training: run main.py --mode train in subprocess, then register model.
Processamento assíncrono via pool limitado (app.tasks).
"""
import subprocess
from pathlib import Path
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app

from app.decorators import require_permission
from app.extensions import db
from app.models.job import TrainingJob
from app.models.trained_model import TrainedModel
from app import tasks as async_tasks

bp = Blueprint("train", __name__)


def _run_train(app, job_id: int, limit: int, epochs: int, db_path: str, base_model_dir: str, model_name: str = None, set_as_default: bool = False):
    with app.app_context():
        _do_train(job_id, limit, epochs, db_path, base_model_dir, model_name, set_as_default)


def _do_train(job_id: int, limit: int, epochs: int, db_path: str, base_model_dir: str, model_name: str = None, set_as_default: bool = False):
    job = TrainingJob.query.get(job_id)
    if not job or job.status != "pending":
        return
    job.status = "running"
    job.started_at = datetime.utcnow()
    db.session.commit()
    try:
        root = Path(__file__).resolve().parent.parent.parent.parent
        cmd = [
            "python", str(root / "main.py"), "--mode", "train",
            "--db-path", db_path, "--model-dir", base_model_dir,
            "--epochs", str(epochs), "--device", "cpu",
        ]
        if limit:
            cmd.extend(["--limit", str(limit)])
        result = subprocess.run(cmd, cwd=str(root), capture_output=True, text=True, timeout=3600)
        if result.returncode != 0:
            job.status = "failed"
            job.message = result.stderr or result.stdout or f"Exit code {result.returncode}"
        else:
            name = (model_name or "").strip() or f"model_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            if set_as_default:
                TrainedModel.query.update({TrainedModel.is_default: False})
            rec = TrainedModel(name=name, path=base_model_dir, is_default=bool(set_as_default))
            db.session.add(rec)
            db.session.commit()
            job.model_id = rec.id
            job.status = "success"
            job.message = f"Model registered as id={rec.id}"
    except subprocess.TimeoutExpired:
        job.status = "failed"
        job.message = "Training timed out"
    except Exception as e:
        job.status = "failed"
        job.message = str(e)
    job.finished_at = datetime.utcnow()
    db.session.commit()


@bp.route("", methods=["POST"])
@require_permission("train.run")
def start_train():
    data = request.get_json() or {}
    limit = int(data.get("limit") or 0) or None
    epochs = int(data.get("epochs") or 60)
    model_name = (data.get("model_name") or "").strip() or None
    set_as_default = bool(data.get("set_as_default"))
    job = TrainingJob(
        status="pending",
        params={"limit": limit, "epochs": epochs, "model_name": model_name, "set_as_default": set_as_default},
    )
    db.session.add(job)
    db.session.commit()
    db_path = current_app.config.get("DRG_DB_PATH", "data/drg_br.db")
    base_model_dir = current_app.config.get("DRG_MODEL_DIR", "models")
    async_tasks.submit_train(
        _run_train,
        current_app._get_current_object(),
        job.id,
        limit,
        epochs,
        db_path,
        base_model_dir,
        model_name,
        set_as_default,
    )
    return jsonify({"id": job.id, "status": job.status, "message": "Training started"}), 202


@bp.route("", methods=["GET"])
@require_permission("train.run")
def list_jobs():
    jobs = TrainingJob.query.order_by(TrainingJob.created_at.desc()).limit(50).all()
    return jsonify([{
        "id": j.id, "status": j.status, "params": j.params, "model_id": j.model_id,
        "started_at": j.started_at.isoformat() if j.started_at else None,
        "finished_at": j.finished_at.isoformat() if j.finished_at else None,
        "created_at": j.created_at.isoformat() if j.created_at else None,
        "message": j.message,
    } for j in jobs])


@bp.route("/<int:job_id>", methods=["GET"])
@require_permission("train.run")
def get_job(job_id):
    job = TrainingJob.query.get_or_404(job_id)
    return jsonify({
        "id": job.id, "status": job.status, "params": job.params, "model_id": job.model_id,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "finished_at": job.finished_at.isoformat() if job.finished_at else None,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "message": job.message,
    })


@bp.route("/models", methods=["GET"])
@require_permission("train.run")
def list_models():
    models = TrainedModel.query.order_by(TrainedModel.created_at.desc()).all()
    return jsonify([
        {
            "id": m.id,
            "name": m.name,
            "path": m.path,
            "is_default": m.is_default,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "metadata": m.metadata_,
        }
        for m in models
    ])


@bp.route("/models/<int:model_id>", methods=["PUT"])
@require_permission("train.run")
def update_model(model_id):
    model = TrainedModel.query.get_or_404(model_id)
    data = request.get_json() or {}
    if "is_default" in data:
        if data["is_default"]:
            TrainedModel.query.update({TrainedModel.is_default: False})
            db.session.commit()
            model.is_default = True
        else:
            model.is_default = False
    if "name" in data and isinstance(data["name"], str):
        name = data["name"].strip()
        if name:
            model.name = name
    db.session.commit()
    return jsonify({
        "id": model.id,
        "name": model.name,
        "path": model.path,
        "is_default": model.is_default,
        "created_at": model.created_at.isoformat() if model.created_at else None,
        "metadata": model.metadata_,
    })
