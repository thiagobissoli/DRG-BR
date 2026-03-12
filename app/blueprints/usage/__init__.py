from datetime import datetime
from flask import Blueprint, request, jsonify
from sqlalchemy import func

from app.decorators import require_permission, require_login
from app.models.user import User
from app.models.api_key import ApiKey, ApiUsageLog, ApiQuota

bp = Blueprint("usage", __name__)


def _current_user():
    from flask_jwt_extended import get_jwt_identity
    try:
        uid = get_jwt_identity()
        return User.query.get(int(uid)) if uid else None
    except Exception:
        return None


@bp.route("/log", methods=["GET"])
@require_login
def list_usage_log():
    user = _current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    # Admin can filter by user_id or api_key_id
    admin = user.has_permission("usage.view")
    query = ApiUsageLog.query.join(ApiKey, ApiUsageLog.api_key_id == ApiKey.id)
    if not admin:
        query = query.filter(ApiKey.user_id == user.id)
    elif request.args.get("user_id"):
        query = query.filter(ApiKey.user_id == int(request.args["user_id"]))
    elif request.args.get("api_key_id"):
        query = query.filter(ApiUsageLog.api_key_id == int(request.args["api_key_id"]))
    since = request.args.get("since")
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
            query = query.filter(ApiUsageLog.requested_at >= since_dt)
        except Exception:
            pass
    logs = query.order_by(ApiUsageLog.requested_at.desc()).limit(500).all()
    return jsonify([{
        "id": l.id, "api_key_id": l.api_key_id, "endpoint": l.endpoint, "method": l.method,
        "requested_at": l.requested_at.isoformat() if l.requested_at else None,
        "status_code": l.status_code, "response_time_ms": l.response_time_ms,
    } for l in logs])


@bp.route("/quotas", methods=["GET"])
@require_login
def list_quotas():
    user = _current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    keys = ApiKey.query.filter_by(user_id=user.id).all()
    result = []
    for k in keys:
        quotas = ApiQuota.query.filter_by(api_key_id=k.id).all()
        # Count usage today for each key
        today = datetime.utcnow().date()
        count = ApiUsageLog.query.filter(
            ApiUsageLog.api_key_id == k.id,
            func.date(ApiUsageLog.requested_at) == today,
        ).count()
        result.append({
            "api_key_id": k.id, "key_name": k.name,
            "quotas": [{"limit_type": q.limit_type, "limit_value": q.limit_value} for q in quotas],
            "usage_today": count,
        })
    return jsonify(result)
