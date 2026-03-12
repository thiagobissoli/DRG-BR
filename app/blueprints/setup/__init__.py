"""
Instalação inicial do sistema: sem login, apenas quando NEEDS_SETUP=True.
Permite configurar .env e executar create_all + seed.
"""
import os
import subprocess
import sys
from pathlib import Path

from flask import Blueprint, request, jsonify, current_app

bp = Blueprint("setup", __name__)


def _env_path():
    # Raiz do projeto = pasta acima do pacote app
    root = Path(current_app.root_path).parent
    return root / ".env"


@bp.route("/status", methods=["GET"])
def status():
    """Indica se o sistema precisa de instalação (sem auth)."""
    needs = current_app.config.get("NEEDS_SETUP", False)
    return jsonify({"needs_setup": bool(needs)})


@bp.route("", methods=["POST"])
def run_setup():
    """Salva .env e executa instalação do banco (create_all + seed). Só quando NEEDS_SETUP=True."""
    if not current_app.config.get("NEEDS_SETUP", False):
        return jsonify({"error": "Sistema já instalado"}), 400

    data = request.get_json() or {}
    database_url = (data.get("database_url") or "").strip()
    if not database_url:
        return jsonify({"error": "database_url é obrigatório"}), 400

    secret_key = (data.get("secret_key") or "").strip() or "change-me-in-production"
    jwt_secret_key = (data.get("jwt_secret_key") or "").strip() or secret_key
    root = _env_path().parent
    drg_db_path = (data.get("drg_db_path") or "").strip() or str(root / "data" / "drg_br.db")
    drg_model_dir = (data.get("drg_model_dir") or "").strip() or str(root / "models")
    drg_cache_dir = (data.get("drg_cache_dir") or "").strip() or str(root / "data" / "cache")
    cors_origins = (data.get("cors_origins") or "").strip() or "*"
    flask_env = (data.get("flask_env") or "").strip() or "production"

    lines = [
        "# DRG-BR — gerado pela instalação",
        "DATABASE_URL=" + _env_escape(database_url),
        "SECRET_KEY=" + _env_escape(secret_key),
        "JWT_SECRET_KEY=" + _env_escape(jwt_secret_key),
        "DRG_DB_PATH=" + _env_escape(drg_db_path),
        "DRG_MODEL_DIR=" + _env_escape(drg_model_dir),
        "DRG_CACHE_DIR=" + _env_escape(drg_cache_dir),
        "CORS_ORIGINS=" + _env_escape(cors_origins),
        "FLASK_ENV=" + _env_escape(flask_env),
    ]
    env_file = _env_path()
    try:
        env_file.parent.mkdir(parents=True, exist_ok=True)
        env_file.write_text("\n".join(lines) + "\n", encoding="utf-8")
    except Exception as e:
        return jsonify({"error": f"Não foi possível gravar o .env: {e}"}), 500

    root = env_file.parent
    try:
        result = subprocess.run(
            [sys.executable, "-m", "app.install"],
            cwd=str(root),
            capture_output=True,
            text=True,
            timeout=120,
            env={**os.environ, "DATABASE_URL": database_url},
        )
        if result.returncode != 0:
            return jsonify({
                "error": "Falha na instalação do banco",
                "detail": result.stderr or result.stdout or str(result.returncode),
            }), 500
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Instalação excedeu o tempo limite"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({
        "message": "Instalação concluída. Reinicie o servidor da aplicação para continuar.",
        "restart_required": True,
    }), 200


def _env_escape(value: str) -> str:
    if "\n" in value or '"' in value or "'" in value:
        return '"' + value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n") + '"'
    if " " in value or "#" in value:
        return '"' + value + '"'
    return value
