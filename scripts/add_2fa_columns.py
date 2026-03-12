"""
Adiciona colunas de 2FA na tabela users (para bancos já existentes).
Execute: python scripts/add_2fa_columns.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app import create_app
from app.extensions import db


def main():
    app = create_app()
    with app.app_context():
        engine = db.engine
        with engine.connect() as conn:
            dialect = engine.dialect.name
            for col, spec in [
                ("otp_secret", "VARCHAR(32) NULL" if dialect == "mysql" else "VARCHAR(32)"),
                ("otp_enabled", "BOOLEAN DEFAULT 0" if dialect == "mysql" else "BOOLEAN DEFAULT FALSE"),
            ]:
                try:
                    if dialect == "mysql":
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {spec}"))
                    else:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {spec}"))
                    conn.commit()
                    print(f"Coluna {col} adicionada.")
                except Exception as e:
                    conn.rollback()
                    if "Duplicate column" in str(e) or "already exists" in str(e).lower():
                        print(f"Coluna {col} já existe.")
                    else:
                        raise
    print("Concluído.")


if __name__ == "__main__":
    main()
