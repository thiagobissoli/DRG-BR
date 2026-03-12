from flask import Blueprint, request, jsonify

from app.decorators import require_permission
from app.extensions import db
from app.models.user import User, Role

bp = Blueprint("users", __name__)


@bp.route("", methods=["GET"])
@require_permission("user.manage")
def list_users():
    users = User.query.all()
    return jsonify([{
        "id": u.id, "email": u.email, "name": u.name, "active": u.active,
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "role_ids": [r.id for r in u.roles],
    } for u in users])


@bp.route("", methods=["POST"])
@require_permission("user.manage")
def create_user():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email:
        return jsonify({"error": "email required"}), 400
    if not password or len(password) < 6:
        return jsonify({"error": "password required (min 6 chars)"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 409
    user = User(email=email, name=(data.get("name") or "").strip() or None)
    user.set_password(password)
    role_ids = data.get("role_ids") or []
    roles = Role.query.filter(Role.id.in_(role_ids)).all()
    user.roles = roles
    db.session.add(user)
    db.session.commit()
    return jsonify({"id": user.id, "email": user.email, "name": user.name, "active": user.active, "role_ids": [r.id for r in user.roles]}), 201


@bp.route("/<int:user_id>", methods=["GET"])
@require_permission("user.manage")
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify({
        "id": user.id, "email": user.email, "name": user.name, "active": user.active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "role_ids": [r.id for r in user.roles],
    })


@bp.route("/<int:user_id>", methods=["PUT"])
@require_permission("user.manage")
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}
    if "name" in data:
        user.name = (data["name"] or "").strip() or None
    if "active" in data:
        user.active = bool(data["active"])
    if "password" in data and data["password"]:
        if len(data["password"]) < 6:
            return jsonify({"error": "password min 6 chars"}), 400
        user.set_password(data["password"])
    if "role_ids" in data:
        roles = Role.query.filter(Role.id.in_(data["role_ids"])).all()
        user.roles = roles
    db.session.commit()
    return jsonify({"id": user.id, "email": user.email, "name": user.name, "active": user.active, "role_ids": [r.id for r in user.roles]})


@bp.route("/<int:user_id>", methods=["DELETE"])
@require_permission("user.manage")
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return "", 204
