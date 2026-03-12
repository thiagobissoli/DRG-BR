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

## Frontend (estático)

O frontend é HTML/JS + Bootstrap/AdminLTE em `frontend/static` e `frontend/public/adminlte`. O Flask serve esses arquivos quando existe a pasta `frontend/static`; não há build nem Node.js. Em produção, o mesmo servidor que roda o Flask (gunicorn atrás de nginx/Apache) deve servir as rotas não-API para o `index.html` e os arquivos estáticos — o código em `app/__init__.py` já faz isso quando `frontend/static` existe.

---

## Checklist rápido

- [ ] `.env` com `FLASK_ENV=production`, `SECRET_KEY`, `JWT_SECRET_KEY`, `DATABASE_URL`, `CORS_ORIGINS`
- [ ] Backend rodando com gunicorn (ou outro WSGI)
- [ ] HTTPS no proxy reverso
- [ ] Frontend estático em `frontend/static` e `frontend/public` (servido pelo Flask)
- [ ] Banco MySQL acessível e migrado/criado (`db.create_all()` roda na subida do app)
