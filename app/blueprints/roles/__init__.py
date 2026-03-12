from flask import Blueprint, request, jsonify

from app.decorators import require_permission
from app.extensions import db
from app.models.user import Role, Permission

bp = Blueprint("roles", __name__)

PERMISSION_NAMES = [
    "extract.run", "train.run", "predict.use",
    "api_key.manage", "user.manage", "role.manage", "usage.view", "config.manage",
]


@bp.route("", methods=["GET"])
@require_permission("role.manage")
def list_roles():
    roles = Role.query.all()
    return jsonify([{"id": r.id, "name": r.name, "description": r.description, "permission_ids": [p.id for p in r.permissions]} for r in roles])


@bp.route("", methods=["POST"])
@require_permission("role.manage")
def create_role():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    if Role.query.filter_by(name=name).first():
        return jsonify({"error": "Role already exists"}), 409
    role = Role(name=name, description=data.get("description") or "")
    perm_ids = data.get("permission_ids") or []
    perms = Permission.query.filter(Permission.id.in_(perm_ids)).all()
    role.permissions = perms
    db.session.add(role)
    db.session.commit()
    return jsonify({"id": role.id, "name": role.name, "description": role.description, "permission_ids": [p.id for p in role.permissions]}), 201


@bp.route("/<int:role_id>", methods=["GET"])
@require_permission("role.manage")
def get_role(role_id):
    role = Role.query.get_or_404(role_id)
    return jsonify({"id": role.id, "name": role.name, "description": role.description, "permission_ids": [p.id for p in role.permissions]})


@bp.route("/<int:role_id>", methods=["PUT"])
@require_permission("role.manage")
def update_role(role_id):
    role = Role.query.get_or_404(role_id)
    data = request.get_json() or {}
    if "description" in data:
        role.description = data["description"]
    if "permission_ids" in data:
        perms = Permission.query.filter(Permission.id.in_(data["permission_ids"])).all()
        role.permissions = perms
    db.session.commit()
    return jsonify({"id": role.id, "name": role.name, "description": role.description, "permission_ids": [p.id for p in role.permissions]})


@bp.route("/permissions", methods=["GET"])
@require_permission("role.manage")
def list_permissions():
    perms = Permission.query.all()
    if not perms:
        for pname in PERMISSION_NAMES:
            p = Permission(name=pname)
            db.session.add(p)
        db.session.commit()
        perms = Permission.query.all()
    return jsonify([{"id": p.id, "name": p.name} for p in perms])
