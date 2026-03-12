# DRG-BR

Sistema preditivo multi-alvo para internações hospitalares (LOS, custos, óbito, evento adverso, UTI), com pipeline de dados SIH-SUS e **plataforma web** (Flask + Bootstrap/AdminLTE).

## Conteúdo

- **Backend**: Flask (API REST), autenticação JWT, 2FA, usuários, perfis, chaves API, extração de dados, treino e predição.
- **Frontend**: Estático (HTML/JS + Bootstrap/AdminLTE), login, dashboard, extração, treino, predição, configurações. Servido pelo próprio Flask.
- **Pipeline**: `main.py` para download (CID-10, SIGTAP, CC/MCC, SIH-SUS), treinamento e predição.

## Documentação

| Arquivo | Descrição |
|---------|-----------|
| [Manual.md](Manual.md) | Comandos CLI, modos (download, train, predict), uso da plataforma |
| [DEPLOY.md](DEPLOY.md) | Deploy em produção (variáveis, gunicorn, frontend) |
| [INSTALAR_PYTHONANYWHERE.md](INSTALAR_PYTHONANYWHERE.md) | Instalação no PythonAnywhere |

## Início rápido

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # ajuste SECRET_KEY, DATABASE_URL, etc.
python run.py          # ou ./start.sh
```

Acesse **http://localhost:5001** — a API e a interface web (Bootstrap/AdminLTE) são servidas pelo Flask. Não é necessário Node.js nem build do frontend.

Requisitos: **Python 3.10+**, **MySQL** (dados da plataforma).

## Licença

Conforme definido no projeto.
