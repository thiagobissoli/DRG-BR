from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity

from app.decorators import require_permission, require_login
from app.extensions import db
from app.models.user import User
from app.models.api_key import ApiKey, ApiQuota

bp = Blueprint("api_keys", __name__)


def _current_user():
    from flask_jwt_extended import get_jwt_identity
    try:
        uid = get_jwt_identity()
        return User.query.get(int(uid)) if uid else None
    except Exception:
        return None


@bp.route("", methods=["GET"])
@require_login
def list_keys():
    user = _current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    # Admin can pass ?user_id=X
    admin = user.has_permission("api_key.manage")
    if admin and request.args.get("user_id"):
        try:
            user = User.query.get(int(request.args["user_id"]))
            if not user:
                return jsonify({"error": "User not found"}), 404
        except ValueError:
            pass
    keys = ApiKey.query.filter_by(user_id=user.id).all()
    result = []
    for k in keys:
        quota = k.quotas.first()
        usage_count = k.usage_logs.count()
        result.append({
            "id": k.id,
            "name": k.name,
            "key": k.key_hash[:20] + "...",
            "created_at": k.created_at.isoformat() if k.created_at else None,
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
            "limit_value": quota.limit_value if quota else 0,
            "usage_count": usage_count,
        })
    return jsonify(result)


@bp.route("", methods=["POST"])
@require_login
def create_key():
    user = _current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json() or {}
    name = (data.get("name") or "").strip() or None
    plain = ApiKey.generate_for_user(user.id, name=name)
    key_obj = ApiKey.query.filter_by(user_id=user.id).order_by(ApiKey.id.desc()).first()
    if key_obj:
        limit_value = int(data.get("limit_value", 1000))
        q = ApiQuota(api_key_id=key_obj.id, limit_type="requests_per_day", limit_value=limit_value)
        db.session.add(q)
        db.session.commit()
    return jsonify({
        "api_key": {
            "id": key_obj.id,
            "key": plain,
            "name": name,
            "limit_value": limit_value,
            "usage_count": 0,
        },
        "message": "Guarde esta chave; ela não será exibida novamente."
    }), 201


@bp.route("/<int:key_id>", methods=["DELETE"])
@require_login
def revoke_key(key_id):
    user = _current_user()
    key_obj = ApiKey.query.get_or_404(key_id)
    if key_obj.user_id != user.id and not user.has_permission("api_key.manage"):
        return jsonify({"error": "Forbidden"}), 403
    db.session.delete(key_obj)
    db.session.commit()
    return "", 204
