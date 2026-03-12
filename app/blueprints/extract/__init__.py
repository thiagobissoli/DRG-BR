"""
Orchestrate data extraction: call DataDownloader (SIH-SUS, CID-10, SIGTAP, CC/MCC, etc.).
Processamento assíncrono via pool limitado (app.tasks).
"""
from flask import Blueprint, request, jsonify, current_app
from datetime import datetime

from app.decorators import require_permission
from app.extensions import db
from app.models.job import ExtractionJob
from app import tasks as async_tasks

bp = Blueprint("extract", __name__)


def _run_extract(app, job_id: int, states: list, years: list, sources: list, db_path: str, cache_dir: str):
    with app.app_context():
        _do_extract(job_id, states, years, sources, db_path, cache_dir)


def _do_extract(job_id: int, states: list, years: list, sources: list, db_path: str, cache_dir: str):
    job = ExtractionJob.query.get(job_id)
    if not job or job.status != "pending":
        return
    job.status = "running"
    job.started_at = datetime.utcnow()
    db.session.commit()
    try:
        from data.database import DRGDatabase
        from data.downloader import DataDownloader
        db_drg = DRGDatabase(db_path)
        downloader = DataDownloader(db_drg, cache_dir=cache_dir)
        downloader.download_all(states=states or ["ES"], years=years or [2022, 2023], force=False)
        job.status = "success"
        job.message = "Extraction completed"
    except Exception as e:
        job.status = "failed"
        job.message = str(e)
    job.finished_at = datetime.utcnow()
    db.session.commit()


@bp.route("", methods=["POST"])
@require_permission("extract.run")
def start_extract():
    data = request.get_json() or {}
    states = data.get("states") or ["ES"]
    years = data.get("years") or [2022, 2023]
    sources = data.get("sources") or ["cid10", "sigtap", "cc_mcc", "sih"]
    job = ExtractionJob(status="pending", sources=sources, params={"states": states, "years": years})
    db.session.add(job)
    db.session.commit()
    db_path = current_app.config.get("DRG_DB_PATH", "data/drg_br.db")
    cache_dir = current_app.config.get("DRG_CACHE_DIR", "data/cache")
    async_tasks.submit_extract(
        _run_extract,
        current_app._get_current_object(),
        job.id,
        states,
        years,
        sources,
        db_path,
        cache_dir,
    )
    return jsonify({"id": job.id, "status": job.status, "message": "Extraction started"}), 202


@bp.route("", methods=["GET"])
@require_permission("extract.run")
def list_jobs():
    jobs = ExtractionJob.query.order_by(ExtractionJob.created_at.desc()).limit(50).all()
    return jsonify([{
        "id": j.id, "status": j.status, "sources": j.sources, "params": j.params,
        "started_at": j.started_at.isoformat() if j.started_at else None,
        "finished_at": j.finished_at.isoformat() if j.finished_at else None,
        "created_at": j.created_at.isoformat() if j.created_at else None,
        "message": j.message,
    } for j in jobs])


@bp.route("/<int:job_id>", methods=["GET"])
@require_permission("extract.run")
def get_job(job_id):
    job = ExtractionJob.query.get_or_404(job_id)
    return jsonify({
        "id": job.id, "status": job.status, "sources": job.sources, "params": job.params,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "finished_at": job.finished_at.isoformat() if job.finished_at else None,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "message": job.message,
    })
