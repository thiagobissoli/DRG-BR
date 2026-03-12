"""
DRG-BR Platform — Flask application factory.
"""
import os
from pathlib import Path

from flask import Flask


def create_app(config_overrides=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object("app.config.Config")
    if config_overrides:
        app.config.update(config_overrides)

    from app.config import IS_PRODUCTION, NEEDS_SETUP
    app.config["NEEDS_SETUP"] = NEEDS_SETUP
    if IS_PRODUCTION and not NEEDS_SETUP:
        for name in ("SECRET_KEY", "JWT_SECRET_KEY", "DATABASE_URL"):
            if not (app.config.get(name) and str(app.config[name]).strip()):
                raise RuntimeError(
                    f"Em produção defina a variável de ambiente: {name}"
                )
        if app.config.get("CORS_ORIGINS") == "*":
            import logging
            logging.getLogger(__name__).warning(
                "CORS_ORIGINS=* em produção pode expor a API. Defina as origens permitidas."
            )

    # Ensure project root is on path for DRG imports
    root = Path(__file__).resolve().parent.parent
    if str(root) not in __import__("sys").path:
        __import__("sys").path.insert(0, str(root))

    from app.extensions import db, login_manager, jwt
    from app.models.user import User
    db.init_app(app)
    login_manager.init_app(app)
    jwt.init_app(app)

    @login_manager.user_loader
    def load_user(uid):
        return User.query.get(int(uid)) if uid else None

    if not NEEDS_SETUP:
        with app.app_context():
            from app import models  # noqa: F401 — register models
            db.create_all()
            from app.seed import seed_if_empty
            seed_if_empty()

    from flask_cors import CORS
    origins = [o.strip() for o in app.config.get("CORS_ORIGINS", "*").split(",") if o.strip()]
    CORS(app, origins=origins, supports_credentials=True)

    from app.blueprints.auth import bp as auth_bp
    from app.blueprints.users import bp as users_bp
    from app.blueprints.roles import bp as roles_bp
    from app.blueprints.api_keys import bp as api_keys_bp
    from app.blueprints.usage import bp as usage_bp
    from app.blueprints.predict import bp as predict_bp
    from app.blueprints.extract import bp as extract_bp
    from app.blueprints.train import bp as train_bp
    from app.blueprints.config import bp as config_bp
    from app.blueprints.setup import bp as setup_bp

    app.register_blueprint(setup_bp, url_prefix="/api/setup")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(roles_bp, url_prefix="/api/roles")
    app.register_blueprint(api_keys_bp, url_prefix="/api/keys")
    app.register_blueprint(usage_bp, url_prefix="/api/usage")
    app.register_blueprint(predict_bp, url_prefix="/api/v1")
    app.register_blueprint(extract_bp, url_prefix="/api/extract")
    app.register_blueprint(train_bp, url_prefix="/api/train")
    app.register_blueprint(config_bp, url_prefix="/api/config")

    @app.route("/health")
    def health():
        return {"status": "ok", "service": "drg-br"}

    # Servir frontend estático (Bootstrap/AdminLTE, sem React)
    from flask import send_from_directory

    _frontend_static = root / "frontend" / "static"
    _frontend_public = root / "frontend" / "public"
    _frontend_build = root / "frontend" / "build"

    def _serve_frontend(path):
        if path.startswith("api/") or path == "api" or path.startswith("health") or path == "health":
            return {"error": "Not found"}, 404
        # Prefer frontend/static (HTML + JS vanilla)
        if _frontend_static.exists():
            if path.startswith("adminlte/"):
                sub = path[9:]  # after "adminlte/"
                file_path = _frontend_public / "adminlte" / sub
                if file_path.is_file():
                    return send_from_directory(str(_frontend_public / "adminlte"), sub)
            static_file = _frontend_static / path
            if path and static_file.is_file():
                return send_from_directory(str(_frontend_static), path)
            if path.startswith("js/"):
                return send_from_directory(str(_frontend_static), path)
            return send_from_directory(str(_frontend_static), "index.html")
        # Fallback: frontend/build (legado)
        if _frontend_build.exists() and _frontend_build.is_dir():
            _build_str = str(_frontend_build)
            file_path = os.path.join(_build_str, path)
            if path and os.path.isfile(file_path):
                return send_from_directory(_build_str, path)
            return send_from_directory(_build_str, "index.html")
        return {"error": "Frontend not found"}, 404

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_spa(path):
        return _serve_frontend(path)

    return app
