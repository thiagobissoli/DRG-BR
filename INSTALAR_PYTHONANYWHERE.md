# Instalar DRG-BR no PythonAnywhere

Este guia descreve como publicar o sistema DRG-BR (Flask + React) no [PythonAnywhere](https://www.pythonanywhere.com/).

---

## 1. Conta e MySQL

1. Crie uma conta em [pythonanywhere.com](https://www.pythonanywhere.com/) (plano gratuito ou pago).
2. Abra a aba **Databases** e crie um banco MySQL:
   - **Create database**: nome sugerido `drg_br` (o nome final será `seu_usuario$drg_br`).
   - Anote o **host** (ex.: `seu_usuario.mysql.pythonanywhere-services.com`), **usuário**, **senha** e **nome do banco** (ex.: `seu_usuario$drg_br`).

---

## 2. Enviar o projeto

**Opção A – Git (recomendado)**  
No Bash do PythonAnywhere (aba **Consoles** > **$ Bash**):

```bash
cd ~
git clone https://github.com/SEU_USUARIO/DRG-BR.git
# ou, se for privado: git clone https://token@github.com/...
cd DRG-BR
```

**Opção B – Upload**  
Envie o projeto (zip ou arquivos) pela aba **Files** e extraia em algo como `/home/seu_usuario/DRG-BR`.

---

## 3. Virtualenv e dependências

No Bash (ajuste `seu_usuario` e o caminho do projeto):

```bash
cd /home/seu_usuario/DRG-BR

# Criar virtualenv (Python 3.10 recomendado)
python3.10 -m venv venv
source venv/bin/activate

# Instalar dependências (torch e lightgbm podem demorar)
pip install --upgrade pip
pip install -r requirements.txt
```

**Nota:** No plano gratuito, a instalação de `torch` pode falhar por limite de memória. Nesse caso você pode:
- usar um plano pago, ou
- remover temporariamente `torch` do `requirements.txt` e instalar o resto (a API sobe, mas treino/predição com modelo neural não funcionará).

---

## 4. Variáveis de ambiente

Na aba **Web** do PythonAnywhere:

1. Clique no seu **Web app** (ou crie um: **Add a new web app** > **Flask** > Python 3.10).
2. Em **Code**:
   - **Source code**: `/home/seu_usuario/DRG-BR`
   - **Working directory**: `/home/seu_usuario/DRG-BR`
   - **Virtualenv**: `/home/seu_usuario/DRG-BR/venv`
3. Em **Configuration file** (WSGI), use o conteúdo abaixo (ajustando `seu_usuario`).

**WSGI (Configuration file):**

Substitua o conteúdo do arquivo WSGI pelo seguinte (troque `seu_usuario` pelo seu login):

```python
import sys
path = '/home/seu_usuario/DRG-BR'
if path not in sys.path:
    sys.path.insert(0, path)

import os
os.chdir(path)
from dotenv import load_dotenv
load_dotenv(os.path.join(path, '.env'))

from run import app as application
```

Ou aponte o **WSGI configuration file** para: `/home/seu_usuario/DRG-BR/wsgi.py` e, dentro de `wsgi.py`, deixe `PROJECT_ROOT = '/home/seu_usuario/DRG-BR'`.

**Variáveis de ambiente (Web > Environment variables):**

Adicione (valores em produção devem ser fortes e secretos):

| Nome | Exemplo |
|------|--------|
| `FLASK_ENV` | `production` |
| `SECRET_KEY` | uma chave longa e aleatória |
| `JWT_SECRET_KEY` | outra chave longa e aleatória |
| `DATABASE_URL` | `mysql+pymysql://seu_usuario:SENHA@seu_usuario.mysql.pythonanywhere-services.com/seu_usuario$drg_br` |
| `CORS_ORIGINS` | `https://seu_usuario.pythonanywhere.com` |

A `DATABASE_URL` deve usar:
- **Host**: o que aparece em Databases (ex.: `seu_usuario.mysql.pythonanywhere-services.com`)
- **Database**: `seu_usuario$drg_br` (com o `$`)

---

## 5. Build do frontend (React)

O frontend precisa ser buildado na sua máquina (ou em outro ambiente com Node) e os arquivos enviados para o servidor, pois o PythonAnywhere não executa `npm run build`.

**Na sua máquina (local):**

```bash
cd frontend
npm ci
# Para o mesmo domínio (Flask servindo API e SPA), não defina VITE_API_URL
npm run build
```

Depois envie a pasta `frontend/build` para o servidor, no mesmo projeto:

- `/home/seu_usuario/DRG-BR/frontend/build`

Por exemplo, via **Files** (upload da pasta) ou `scp`/rsync. O Flask servirá automaticamente esse build quando a rota não for `/api/...` nem `/health`.

---

## 6. Reload e teste

1. Na aba **Web**, clique em **Reload** (endereço verde).
2. Acesse: `https://seu_usuario.pythonanywhere.com/`
   - Deve abrir a interface React (login).
3. Teste a API: `https://seu_usuario.pythonanywhere.com/health`  
   Deve retornar algo como: `{"status":"ok","service":"drg-br"}`.

---

## 7. Primeiro usuário

Se o banco acabou de ser criado, as tabelas e o seed (usuário inicial) são criados na primeira requisição que carrega o app. Se o seed criar um usuário padrão, use-o para login ou crie um novo pela interface (se houver registro) ou por script/consola.

Caso o seed não crie usuário, você pode criar um admin pela consola Bash:

```bash
cd /home/seu_usuario/DRG-BR
source venv/bin/activate
python -c "
from app import create_app
from app.extensions import db
from app.models.user import User
app = create_app()
with app.app_context():
    u = User(email='admin@exemplo.com', name='Admin')
    u.set_password('sua_senha_segura')
    db.session.add(u)
    db.session.commit()
    print('Usuário criado.')
"
```

---

## 8. Limitações no plano gratuito

- **Request timeout**: requisições longas (ex.: treino ou extração pesada) podem ser cortadas. Para jobs longos, use plano pago ou rode treino/extração em outro ambiente.
- **Whitelist**: chamadas HTTP de saída só para domínios permitidos (ex.: DATASUS). PySUS/downloads podem precisar estar na whitelist.
- **Memória**: instalação de `torch` pode falhar no free tier; considere plano pago ou dependências reduzidas.

---

## 9. Resumo de caminhos no PythonAnywhere

| Item | Caminho |
|------|--------|
| Projeto | `/home/seu_usuario/DRG-BR` |
| Virtualenv | `/home/seu_usuario/DRG-BR/venv` |
| WSGI | Apontar para `.../DRG-BR/wsgi.py` ou colar o conteúdo no arquivo WSGI da Web app |
| Build do frontend | `/home/seu_usuario/DRG-BR/frontend/build` (gerado na sua máquina e enviado) |
| `.env` (opcional) | `/home/seu_usuario/DRG-BR/.env` (ou use só as variáveis no dashboard) |

Com isso o sistema fica instalado no PythonAnywhere com API e interface web no mesmo domínio.
