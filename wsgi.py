"""
WSGI entry point para PythonAnywhere (e outros hosts que usam WSGI).
No PythonAnywhere: em "Web" > "WSGI configuration file", aponte para este arquivo.
O caminho do projeto é o diretório onde está este wsgi.py (ou defina PROJECT_ROOT no ambiente).
"""
import os
import sys

# Caminho do projeto (diretório onde está wsgi.py, ou variável de ambiente)
PROJECT_ROOT = os.environ.get("PROJECT_ROOT") or os.path.dirname(os.path.abspath(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Carregar .env do diretório do projeto (opcional; no PA pode usar variáveis no dashboard)
os.chdir(PROJECT_ROOT)
from dotenv import load_dotenv
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

from run import app as application
