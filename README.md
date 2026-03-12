# DRG-BR

Sistema preditivo multi-alvo para internações hospitalares (LOS, custos, óbito, evento adverso, UTI), com pipeline de dados SIH-SUS e **plataforma web** (Flask + React).

## Conteúdo

- **Backend**: Flask (API REST), autenticação JWT, 2FA, usuários, perfis, chaves API, extração de dados, treino e predição.
- **Frontend**: React (CoreUI), login, dashboard, extração, treino, predição, configurações.
- **Pipeline**: `main.py` para download (CID-10, SIGTAP, CC/MCC, SIH-SUS), treinamento e predição.

## Documentação

| Arquivo | Descrição |
|---------|-----------|
| [Manual.md](Manual.md) | Comandos CLI, modos (download, train, predict), uso da plataforma |
| [DEPLOY.md](DEPLOY.md) | Deploy em produção (variáveis, gunicorn, frontend) |
| [INSTALAR_PYTHONANYWHERE.md](INSTALAR_PYTHONANYWHERE.md) | Instalação no PythonAnywhere |

## Início rápido

```bash
# Backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # ajuste SECRET_KEY, DATABASE_URL, etc.
python run.py          # API em http://0.0.0.0:5001

# Frontend (outro terminal)
cd frontend && npm ci && npm run dev   # http://localhost:3000
```

Requisitos: **Python 3.10+**, **Node.js** (frontend), **MySQL** (dados da plataforma).

## Licença

Conforme definido no projeto.
