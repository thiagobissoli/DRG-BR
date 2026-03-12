# DRG-BR — Deploy em produção

## Backend (Flask)

1. **Variáveis de ambiente** (copie `.env.example` para `.env` e ajuste):
   - `FLASK_ENV=production`
   - `FLASK_DEBUG=0` (ou não defina)
   - `SECRET_KEY` — obrigatório; use um valor forte e único (ex: 32+ caracteres aleatórios)
   - `JWT_SECRET_KEY` — obrigatório; outro valor forte
   - `DATABASE_URL` — obrigatório; ex: `mysql+pymysql://user:senha@host:3306/drg_br`
   - `CORS_ORIGINS` — origens permitidas do frontend, separadas por vírgula (ex: `https://app.seudominio.com`). Não use `*` em produção.

2. **Servidor WSGI** (não use `python run.py` em produção):
   ```bash
   gunicorn -w 4 -b 0.0.0.0:5001 "run:app"
   ```
   Ou com variável: `PORT=5001 gunicorn -w 4 -b 0.0.0.0:$PORT "run:app"`

3. **Proxy reverso**: coloque o Flask atrás de nginx/Apache com HTTPS e proxy para `http://127.0.0.1:5001`.

---

## Frontend (React/Vite)

1. **Build de produção**:
   ```bash
   cd frontend
   npm ci
   npm run build
   ```
   Saída em `frontend/build/`.

2. **URL do backend**: se o frontend for servido em outro domínio que o backend, crie `frontend/.env.production` (ou defina no CI) com:
   ```bash
   VITE_API_URL=https://api.seudominio.com
   ```
   Depois rode `npm run build` de novo. Se não definir, o frontend usa a mesma origem (adequado quando há proxy reverso servindo API e SPA no mesmo host).

3. **Servir os arquivos**: aponte o servidor web (nginx/Apache) para a pasta `frontend/build/`; configure fallback para `index.html` nas rotas do React (HashRouter usa `#`, então não é necessário rewrite se usar `#/`).

---

## Checklist rápido

- [ ] `.env` com `FLASK_ENV=production`, `SECRET_KEY`, `JWT_SECRET_KEY`, `DATABASE_URL`, `CORS_ORIGINS`
- [ ] Backend rodando com gunicorn (ou outro WSGI)
- [ ] HTTPS no proxy reverso
- [ ] Frontend build com `VITE_API_URL` se API em outro domínio
- [ ] Banco MySQL acessível e migrado/criado (`db.create_all()` roda na subida do app)
