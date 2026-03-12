# Instalar DRG-BR no PythonAnywhere

Este guia descreve como publicar o sistema DRG-BR (Flask + frontend Bootstrap/AdminLTE) no [PythonAnywhere](https://www.pythonanywhere.com/).

---

## Instalador do sistema

O DRG-BR oferece duas formas de instalação inicial:

1. **Pelo terminal (recomendado em servidor)**  
   Na raiz do projeto, com o virtualenv ativado:
   ```bash
   python instalar.py
   ```
   O script pergunta DATABASE_URL, SECRET_KEY, etc., cria o `.env`, o banco (MySQL) se necessário, e as tabelas. Para usar valores padrão sem perguntar: `python instalar.py --batch`. Para só verificar se já está instalado: `python instalar.py --check`.

2. **Pela web**  
   Se o `.env` não tiver `DATABASE_URL` configurado, ao acessar o sistema no navegador será exibido o **Instalador**: um formulário para preencher as configurações. Após clicar em *Instalar sistema*, reinicie o servidor e faça login com `admin@drgbr.local` / `admin123`.

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

Use **Python 3.11** (no PythonAnywhere, escolha a versão 3.11.x, ex.: 3.11.9).

No Bash (ajuste `seu_usuario` e o caminho do projeto):

```bash
cd /home/seu_usuario/DRG-BR

# Criar virtualenv com Python 3.11 (ex.: 3.11.9)
python3.11 -m venv venv
# Se der "command not found", use: python3 -m venv venv

# Ativar o venv (obrigatório antes de qualquer pip install)
source venv/bin/activate
# O prompt deve mostrar (venv) no início

# Confirmar versão (deve ser 3.11.x)
python --version

# Atualizar pip
pip install --upgrade pip

# Instalar PyTorch só para CPU (evita baixar CUDA/cuDNN ~700 MB e erro "Disk quota exceeded")
pip install torch --index-url https://download.pytorch.org/whl/cpu

# Instalar o resto das dependências
pip install -r requirements.txt
```

**Importante:**
- **Sempre** rode `source venv/bin/activate` antes de usar `pip` ou `python` no projeto. Se aparecer "Defaulting to user installation because normal site-packages is not writeable", é porque o venv não está ativado — a Web app usa o venv, então os pacotes precisam estar dentro dele.
- **PyTorch CPU-only:** No PythonAnywhere não há GPU. Instalar `torch` pelo índice padrão puxa pacotes NVIDIA (CUDA/cuDNN) de centenas de MB e pode estourar a cota de disco ("Disk quota exceeded"). Por isso instale primeiro com `--index-url https://download.pytorch.org/whl/cpu`.

**Se a instalação de `torch` falhar por memória** (plano gratuito): use um plano pago ou remova temporariamente `torch` do `requirements.txt` e instale o resto (a API sobe, mas treino/predição com modelo neural não funcionará).

---

## 4. Variáveis de ambiente

Na aba **Web** do PythonAnywhere:

1. Clique no seu **Web app** (ou crie um: **Add a new web app** > **Flask** > **Python 3.11**).
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

## 5. Frontend estático

O frontend é **estático** (HTML/JS + Bootstrap/AdminLTE, sem React). Os arquivos ficam em `frontend/static` e `frontend/public/adminlte`. O Flask serve esses arquivos automaticamente; **não é necessário npm nem build**. Ao clonar ou enviar o projeto, a interface já está incluída.

---

## 6. Reload e teste

1. Na aba **Web**, clique em **Reload** (endereço verde).
2. Acesse: `https://seu_usuario.pythonanywhere.com/`
   - Deve abrir a interface web (login).
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

## 8. Atualizar o código no PythonAnywhere

Quando houver novas alterações no GitHub:

**1. No Bash do PythonAnywhere** (Consoles → $ Bash). **Ative sempre o venv** antes de rodar `pip`:

```bash
cd ~/DRG-BR
git pull origin main
source venv/bin/activate
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
```

**2. Reload do site**

- Aba **Web** → botão verde **Reload** no seu app.

O frontend é estático (em `frontend/static` e `frontend/public`); não é necessário build nem upload de pasta.

---

## 9. Limitações no plano gratuito (free tier)

- **Cota de disco:** O plano gratuito tem poucos MB. Instalar `torch` pelo índice padrão do pip puxa pacotes NVIDIA (CUDA/cuDNN, ~700 MB) e causa **"Disk quota exceeded"**. Sempre use a versão CPU-only: `pip install torch --index-url https://download.pytorch.org/whl/cpu` (com o venv ativado).
- **Request timeout:** Requisições longas (ex.: treino ou extração pesada) podem ser cortadas. Para jobs longos, use plano pago ou rode treino/extração em outro ambiente.
- **Whitelist:** Chamadas HTTP de saída só para domínios permitidos (ex.: DATASUS). PySUS/downloads podem precisar estar na whitelist.
- **Memória:** A instalação de `torch` pode falhar no free tier por limite de RAM; nesse caso use plano pago ou dependências reduzidas (sem torch).

---

## 10. Resumo de caminhos no PythonAnywhere

| Item | Caminho / valor |
|------|-----------------|
| **Python** | **3.11** (ex.: 3.11.9 — use `python3.11` no venv e escolha Python 3.11 ao criar a Web app) |
| Projeto | `/home/seu_usuario/DRG-BR` |
| Virtualenv | `/home/seu_usuario/DRG-BR/venv` — **sempre** `source venv/bin/activate` antes de `pip`/`python` |
| PyTorch no PA | Instalar com `pip install torch --index-url https://download.pytorch.org/whl/cpu` (evita CUDA e cota de disco) |
| WSGI | Apontar para `.../DRG-BR/wsgi.py` ou colar o conteúdo no arquivo WSGI da Web app |
| Frontend estático | `frontend/static` e `frontend/public/adminlte` (servidos pelo Flask) |
| `.env` (opcional) | `/home/seu_usuario/DRG-BR/.env` (ou use só as variáveis no dashboard) |

Com isso o sistema fica instalado no PythonAnywhere com API e interface web no mesmo domínio.
