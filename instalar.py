#!/usr/bin/env python3
"""
Instalador do sistema DRG-BR.
Configura o .env, cria o banco de dados (se necessário) e inicializa tabelas e usuário admin.

Uso:
  python instalar.py              # Modo interativo
  python instalar.py --batch     # Usa valores padrão (MySQL local)
  python instalar.py --check     # Apenas verifica se já está instalado

Variáveis de ambiente (modo não interativo):
  INSTALL_DATABASE_URL, INSTALL_SECRET_KEY, INSTALL_JWT_SECRET_KEY,
  INSTALL_DRG_DB_PATH, INSTALL_DRG_MODEL_DIR, INSTALL_DRG_CACHE_DIR,
  INSTALL_CORS_ORIGINS, INSTALL_FLASK_ENV
"""
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
os.chdir(ROOT)

# Carrega .env existente para não sobrescrever sem necessidade
from dotenv import load_dotenv
load_dotenv(ROOT / ".env")


def _env_escape(value: str) -> str:
    if not value:
        return ""
    if "\n" in value or '"' in value:
        return '"' + value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n") + '"'
    if " " in value or "#" in value:
        return '"' + value + '"'
    return value


def _already_installed() -> bool:
    """Verifica se o sistema já está instalado (DATABASE_URL definido e banco acessível)."""
    load_dotenv(ROOT / ".env")
    url = (os.environ.get("DATABASE_URL") or "").strip()
    if not url or url.lower() in ("not_configured", "not configured"):
        return False
    try:
        from app import create_app
        app = create_app()
        with app.app_context():
            from app.extensions import db
            from app.models.user import User
            db.session.execute(db.text("SELECT 1"))
            User.query.first()
        return True
    except Exception:
        return False


def _create_mysql_database_if_needed(database_url: str) -> bool:
    """Se for MySQL, cria o banco se não existir. Retorna True se OK."""
    m = re.match(r"mysql\+pymysql://([^:]+):([^@]+)@([^/]+)/(.*)", database_url)
    if not m:
        return True
    user, password, host, dbname = m.groups()
    host_part = host.split(":")
    hostname = host_part[0]
    port = int(host_part[1]) if len(host_part) > 1 else 3306
    try:
        import pymysql
        conn = pymysql.connect(
            host=hostname, user=user, password=password, port=port
        )
        conn.cursor().execute(f"CREATE DATABASE IF NOT EXISTS `{dbname}`")
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"  Aviso: não foi possível criar o banco MySQL: {e}")
        return False


def _write_env(config: dict) -> None:
    env_path = ROOT / ".env"
    lines = ["# DRG-BR — gerado pelo instalador"]
    for key, value in config.items():
        if value is not None and str(value).strip():
            lines.append(key + "=" + _env_escape(str(value).strip()))
    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _run_install(config: dict) -> bool:
    """Grava .env e executa create_all + seed. Retorna True se sucesso."""
    _write_env(config)
    os.environ["DATABASE_URL"] = config["DATABASE_URL"]
    os.environ["SECRET_KEY"] = config.get("SECRET_KEY") or ""
    os.environ["JWT_SECRET_KEY"] = config.get("JWT_SECRET_KEY") or ""
    load_dotenv(ROOT / ".env", override=True)
    try:
        from app import create_app
        app = create_app()
        return True
    except Exception as e:
        print(f"Erro ao instalar banco: {e}")
        return False


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Instalador DRG-BR")
    parser.add_argument("--batch", action="store_true", help="Modo não interativo (valores padrão)")
    parser.add_argument("--check", action="store_true", help="Apenas verifica se já está instalado")
    args = parser.parse_args()

    print()
    print("  ═══════════════════════════════════════════")
    print("       INSTALADOR DRG-BR")
    print("  ═══════════════════════════════════════════")
    print()

    if args.check:
        if _already_installed():
            print("  O sistema já está instalado.")
            print()
            return 0
        print("  O sistema ainda não está instalado (DATABASE_URL ausente ou banco inacessível).")
        print()
        return 1

    if _already_installed():
        print("  O sistema já está instalado. Nada a fazer.")
        print("  Para reconfigurar, edite o arquivo .env e reinicie o servidor.")
        print()
        return 0

    # Coleta configuração
    if args.batch:
        database_url = os.environ.get("INSTALL_DATABASE_URL", "mysql+pymysql://root:12345678@localhost:3306/drg_br")
        secret_key = os.environ.get("INSTALL_SECRET_KEY", "altere-em-producao-" + os.urandom(8).hex())
        jwt_secret_key = os.environ.get("INSTALL_JWT_SECRET_KEY", "") or secret_key
        drg_db_path = os.environ.get("INSTALL_DRG_DB_PATH", str(ROOT / "data" / "drg_br.db"))
        drg_model_dir = os.environ.get("INSTALL_DRG_MODEL_DIR", str(ROOT / "models"))
        drg_cache_dir = os.environ.get("INSTALL_DRG_CACHE_DIR", str(ROOT / "data" / "cache"))
        cors_origins = os.environ.get("INSTALL_CORS_ORIGINS", "*")
        flask_env = os.environ.get("INSTALL_FLASK_ENV", "production")
    else:
        print("  Configure a conexão com o banco de dados e as chaves de segurança.")
        print()
        database_url = input("  DATABASE_URL [mysql+pymysql://root:12345678@localhost:3306/drg_br]: ").strip() or "mysql+pymysql://root:12345678@localhost:3306/drg_br"
        secret_key = input("  SECRET_KEY (deixe vazio para gerar): ").strip()
        if not secret_key:
            secret_key = "altere-em-producao-" + os.urandom(8).hex()
            print(f"    Gerado: {secret_key[:20]}...")
        jwt_secret_key = input("  JWT_SECRET_KEY (vazio = usa SECRET_KEY): ").strip() or secret_key
        drg_db_path = input(f"  DRG_DB_PATH [{ROOT / 'data' / 'drg_br.db'}]: ").strip() or str(ROOT / "data" / "drg_br.db")
        drg_model_dir = input(f"  DRG_MODEL_DIR [{ROOT / 'models'}]: ").strip() or str(ROOT / "models")
        drg_cache_dir = input(f"  DRG_CACHE_DIR [{ROOT / 'data' / 'cache'}]: ").strip() or str(ROOT / "data" / "cache")
        cors_origins = input("  CORS_ORIGINS [*]: ").strip() or "*"
        flask_env = input("  FLASK_ENV [production]: ").strip() or "production"

    config = {
        "DATABASE_URL": database_url,
        "SECRET_KEY": secret_key,
        "JWT_SECRET_KEY": jwt_secret_key,
        "DRG_DB_PATH": drg_db_path,
        "DRG_MODEL_DIR": drg_model_dir,
        "DRG_CACHE_DIR": drg_cache_dir,
        "CORS_ORIGINS": cors_origins,
        "FLASK_ENV": flask_env,
    }

    print()
    print("  Criando banco de dados (se for MySQL)...")
    _create_mysql_database_if_needed(database_url)
    print("  Gravando .env e inicializando tabelas...")
    if not _run_install(config):
        return 1
    print()
    print("  ═══════════════════════════════════════════")
    print("       INSTALAÇÃO CONCLUÍDA")
    print("  ═══════════════════════════════════════════")
    print()
    print("  Próximos passos:")
    print("    1. Inicie o servidor:  python run.py")
    print("    2. Acesse no navegador: http://127.0.0.1:5001")
    print("    3. Login padrão: admin@drgbr.local / admin123")
    print()
    print("  Altere a senha do admin após o primeiro acesso.")
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
