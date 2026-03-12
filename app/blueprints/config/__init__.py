"""
Configuração do sistema: leitura e gravação do .env (requer config.manage para PUT).
"""
import os
from pathlib import Path

from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.decorators import require_permission
from app.models.user import User

bp = Blueprint("config", __name__)


def _env_path():
    return Path(current_app.root_path).parent / ".env"


def _env_escape(value: str) -> str:
    if not value:
        return ""
    if "\n" in value or '"' in value or "'" in value:
        return '"' + value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n") + '"'
    if " " in value or "#" in value:
        return '"' + value + '"'
    return value


@bp.route("", methods=["GET"])
@jwt_required()
def get_config():
    """Retorna configurações para exibição/edição na página de configurações."""
    c = current_app.config
    db_url = c.get("DATABASE_URL") or ""
    if db_url and "@" in db_url:
        parts = db_url.split("@", 1)
        if ":" in parts[0]:
            user_part = parts[0].split(":", 1)[0] + ":****"
            masked = user_part + "@" + parts[1]
        else:
            masked = "****@" + parts[1]
    else:
        masked = "****" if db_url else ""
    uid = get_jwt_identity()
    user = User.query.get(int(uid)) if uid else None
    can_manage = user and user.has_permission("config.manage") if user else False
    return jsonify({
        "DATABASE_URL": masked,
        "DATABASE_URL_set": bool(db_url),
        "DRG_DB_PATH": c.get("DRG_DB_PATH", ""),
        "DRG_MODEL_DIR": c.get("DRG_MODEL_DIR", ""),
        "DRG_CACHE_DIR": c.get("DRG_CACHE_DIR", ""),
        "CORS_ORIGINS": c.get("CORS_ORIGINS", "*"),
        "FLASK_ENV": c.get("FLASK_ENV", "production"),
        "can_manage_config": can_manage,
    })


@bp.route("", methods=["PUT"])
@jwt_required()
@require_permission("config.manage")
def update_config():
    """Atualiza o arquivo .env com os valores enviados. Reinício do servidor necessário para aplicar."""
    data = request.get_json() or {}
    env_path = _env_path()
    existing = {}
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                existing[k] = v
    if "database_url" in data and data["database_url"]:
        existing["DATABASE_URL"] = (data.get("database_url") or "").strip()
    if "drg_db_path" in data:
        existing["DRG_DB_PATH"] = (data.get("drg_db_path") or "").strip()
    if "drg_model_dir" in data:
        existing["DRG_MODEL_DIR"] = (data.get("drg_model_dir") or "").strip()
    if "drg_cache_dir" in data:
        existing["DRG_CACHE_DIR"] = (data.get("drg_cache_dir") or "").strip()
    if "cors_origins" in data:
        existing["CORS_ORIGINS"] = (data.get("cors_origins") or "").strip() or "*"
    if "flask_env" in data:
        existing["FLASK_ENV"] = (data.get("flask_env") or "").strip() or "production"
    if "secret_key" in data and data["secret_key"]:
        existing["SECRET_KEY"] = (data.get("secret_key") or "").strip()
    if "jwt_secret_key" in data and data["jwt_secret_key"]:
        existing["JWT_SECRET_KEY"] = (data.get("jwt_secret_key") or "").strip()

    priority_keys = ("DATABASE_URL", "SECRET_KEY", "JWT_SECRET_KEY", "DRG_DB_PATH", "DRG_MODEL_DIR", "DRG_CACHE_DIR", "CORS_ORIGINS", "FLASK_ENV")
    written = set()
    lines = ["# DRG-BR"]
    for key in priority_keys:
        if key in existing and existing[key]:
            lines.append(key + "=" + _env_escape(existing[key]))
            written.add(key)
    for key in sorted(existing.keys()):
        if key not in written and existing[key]:
            lines.append(key + "=" + _env_escape(existing[key]))
    try:
        env_path.parent.mkdir(parents=True, exist_ok=True)
        env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    except Exception as e:
        return jsonify({"error": f"Não foi possível gravar o .env: {e}"}), 500
    return jsonify({
        "message": "Configuração salva. Reinicie o servidor para aplicar as alterações.",
        "restart_required": True,
    })
