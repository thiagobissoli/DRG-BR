from datetime import timedelta

import pyotp
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required,
    decode_token,
)

from app.extensions import db
from app.models.user import User

bp = Blueprint("auth", __name__)


def _totp_verify(secret: str, code: str) -> bool:
    if not secret or not code:
        return False
    try:
        totp = pyotp.TOTP(secret)
        return totp.verify(code.strip(), valid_window=1)
    except Exception:
        return False


@bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or not password:
        return jsonify({"error": "email and password required"}), 400
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401
    if not user.active:
        return jsonify({"error": "Account disabled"}), 403

    if user.otp_enabled and user.otp_secret:
        temporary_token = create_access_token(
            identity=str(user.id),
            additional_claims={"type": "2fa_pending"},
            expires_delta=timedelta(minutes=5),
        )
        return jsonify({
            "requires_2fa": True,
            "temporary_token": temporary_token,
            "message": "Informe o código do aplicativo autenticador",
        }), 200

    token = create_access_token(identity=str(user.id))
    return jsonify({
        "access_token": token,
        "user": {"id": user.id, "email": user.email, "name": user.name},
    })


@bp.route("/2fa/verify-login", methods=["POST"])
def verify_2fa_login():
    data = request.get_json() or {}
    temporary_token = data.get("temporary_token")
    code = data.get("code") or ""
    if not temporary_token or not code:
        return jsonify({"error": "temporary_token and code required"}), 400
    try:
        decoded = decode_token(temporary_token)
        if decoded.get("type") != "2fa_pending":
            return jsonify({"error": "Invalid token"}), 401
        user_id = decoded.get("sub")
        user = User.query.get(int(user_id))
        if not user or not user.active or not user.otp_enabled or not user.otp_secret:
            return jsonify({"error": "Invalid or expired token"}), 401
        if not _totp_verify(user.otp_secret, code):
            return jsonify({"error": "Código inválido ou expirado"}), 401
        token = create_access_token(identity=str(user.id))
        return jsonify({
            "access_token": token,
            "user": {"id": user.id, "email": user.email, "name": user.name},
        })
    except Exception:
        return jsonify({"error": "Invalid or expired token"}), 401


@bp.route("/2fa/setup", methods=["POST"])
@jwt_required()
def setup_2fa():
    uid = get_jwt_identity()
    user = User.query.get(int(uid))
    if not user or not user.active:
        return jsonify({"error": "Unauthorized"}), 401
    if user.otp_enabled:
        return jsonify({"error": "2FA já está ativo. Desative primeiro para reconfigurar."}), 400
    secret = pyotp.random_base32()
    user.otp_secret = secret
    user.otp_enabled = False
    db.session.commit()
    totp = pyotp.TOTP(secret)
    issuer = "DRG-BR"
    otp_uri = totp.provisioning_uri(name=user.email, issuer_name=issuer)
    return jsonify({
        "secret": secret,
        "otp_uri": otp_uri,
        "message": "Adicione a conta no aplicativo autenticador e informe o código para ativar.",
    })


@bp.route("/2fa/verify-setup", methods=["POST"])
@jwt_required()
def verify_2fa_setup():
    data = request.get_json() or {}
    code = (data.get("code") or "").strip()
    if not code:
        return jsonify({"error": "code required"}), 400
    uid = get_jwt_identity()
    user = User.query.get(int(uid))
    if not user or not user.active or not user.otp_secret:
        return jsonify({"error": "Execute o setup primeiro"}), 400
    if not _totp_verify(user.otp_secret, code):
        return jsonify({"error": "Código inválido. Tente novamente."}), 401
    user.otp_enabled = True
    db.session.commit()
    return jsonify({"message": "Autenticação em dois fatores ativada com sucesso."})


@bp.route("/2fa/disable", methods=["POST"])
@jwt_required()
def disable_2fa():
    data = request.get_json() or {}
    password = data.get("password") or ""
    code = (data.get("code") or "").strip()
    if not password:
        return jsonify({"error": "password required"}), 400
    uid = get_jwt_identity()
    user = User.query.get(int(uid))
    if not user or not user.active:
        return jsonify({"error": "Unauthorized"}), 401
    if not user.check_password(password):
        return jsonify({"error": "Senha incorreta"}), 401
    if user.otp_enabled and user.otp_secret:
        if not code:
            return jsonify({"error": "Informe o código do aplicativo autenticador"}), 400
        if not _totp_verify(user.otp_secret, code):
            return jsonify({"error": "Código inválido"}), 401
    user.otp_secret = None
    user.otp_enabled = False
    db.session.commit()
    return jsonify({"message": "Autenticação em dois fatores desativada."})


@bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    uid = get_jwt_identity()
    user = User.query.get(int(uid))
    if not user or not user.active:
        return jsonify({"error": "Unauthorized"}), 401
    roles = [r.name for r in user.roles]
    perms = []
    for r in user.roles:
        for p in r.permissions:
            if p.name not in perms:
                perms.append(p.name)
    return jsonify({
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "roles": roles,
        "permissions": perms,
        "otp_enabled": bool(user.otp_enabled),
    })


@bp.route("/me", methods=["PUT"])
@jwt_required()
def update_me():
    """Permite ao usuário logado atualizar próprio nome e/ou senha."""
    uid = get_jwt_identity()
    user = User.query.get(int(uid))
    if not user or not user.active:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json() or {}
    if "name" in data:
        user.name = (data["name"] or "").strip() or None
    if "password" in data and data["password"]:
        current_password = (data.get("current_password") or "").strip()
        if not current_password:
            return jsonify({"error": "current_password obrigatório para alterar senha"}), 400
        if not user.check_password(current_password):
            return jsonify({"error": "Senha atual incorreta"}), 401
        new_password = (data["password"] or "").strip()
        if len(new_password) < 6:
            return jsonify({"error": "Nova senha deve ter no mínimo 6 caracteres"}), 400
        user.set_password(new_password)
    db.session.commit()
    return jsonify({
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "message": "Perfil atualizado.",
    })
