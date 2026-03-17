"""
Configuration from environment (.env).
Produção: defina SECRET_KEY, JWT_SECRET_KEY, DATABASE_URL e CORS_ORIGINS.
Se DATABASE_URL estiver vazio ou ausente, o sistema entra em modo instalação (sem login).
"""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parent.parent
IS_PRODUCTION = os.environ.get("FLASK_ENV", "production") == "production"

# Modo instalação: quando DATABASE_URL não está definido (ou é placeholder)
_DATABASE_URL_RAW = (os.environ.get("DATABASE_URL") or "").strip()
# Usar PyMySQL em vez de MySQLdb (evita "No module named 'MySQLdb'" quando só pymysql está instalado)
if _DATABASE_URL_RAW.startswith("mysql://") and "pymysql" not in _DATABASE_URL_RAW:
    _DATABASE_URL_RAW = _DATABASE_URL_RAW.replace("mysql://", "mysql+pymysql://", 1)
NEEDS_SETUP = not _DATABASE_URL_RAW or _DATABASE_URL_RAW.lower() in ("", "not_configured", "not configured")


class Config:
    FLASK_ENV = os.environ.get("FLASK_ENV", "production")
    DEBUG = os.environ.get("FLASK_DEBUG", "0").lower() in ("1", "true", "yes")
    TESTING = False

    SECRET_KEY = os.environ.get("SECRET_KEY") or (
        "dev-secret-change-in-production" if not IS_PRODUCTION else ""
    )
    DATABASE_URL = _DATABASE_URL_RAW or None
    # Em modo instalação usamos SQLite em memória para o app não quebrar; não será usado para dados
    SQLALCHEMY_DATABASE_URI = DATABASE_URL if not NEEDS_SETUP else "sqlite:///:memory:"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # pool_recycle evita erro no PythonAnywhere (conexões fechadas após ~300s)
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 280}

    # JWT
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or SECRET_KEY
    JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES", 86400))  # 24h
    JWT_COOKIE_SECURE = IS_PRODUCTION
    JWT_COOKIE_CSRF_PROTECT = False

    # Cookies e sessão
    SESSION_COOKIE_SECURE = IS_PRODUCTION
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    PERMANENT_SESSION_LIFETIME = 86400

    # CORS — em produção defina CORS_ORIGINS (ex: https://app.seudominio.com)
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").strip() or "*"

    # DRG-BR paths
    DRG_DB_PATH = os.environ.get("DRG_DB_PATH", str(ROOT / "data" / "drg_br.db"))
    DRG_MODEL_DIR = os.environ.get("DRG_MODEL_DIR", str(ROOT / "models"))
    DRG_CACHE_DIR = os.environ.get("DRG_CACHE_DIR", str(ROOT / "data" / "cache"))
