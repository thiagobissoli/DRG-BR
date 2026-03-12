"""
Executa a aplicação com o .env atual (create_all + seed dentro de create_app).
Usado após o usuário salvar a configuração na tela de instalação.
"""
import os
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
if str(root) not in sys.path:
    sys.path.insert(0, str(root))
os.chdir(root)

from dotenv import load_dotenv
load_dotenv(override=True)


if __name__ == "__main__":
    from app import create_app
    create_app()
    sys.exit(0)
