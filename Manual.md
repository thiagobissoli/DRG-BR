# Manual de Comandos — DRG-BR

Sistema preditivo multi-alvo para internações (LOS, custos, óbito, evento adverso, UTI). Inclui pipeline CLI (main.py) e **Plataforma Web** (Flask + MySQL + React) com autenticação, perfis, chaves de API, extração, treino e predição.

---

## 1. Pré-requisitos

- **Python 3.10+**
- **Ambiente virtual** (recomendado):

```bash
python3 -m venv venv
source venv/bin/activate   # Linux/macOS
# ou: venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

---

## 2. Comando principal: `main.py`

O ponto de entrada é `main.py`. Todos os modos:

| Modo        | Descrição |
|------------|-----------|
| `full`     | Download + treinamento em sequência |
| `download` | Apenas download das bases → SQLite |
| `train`    | Apenas treinamento (banco já populado) |
| `predict`  | Predição com modelos salvos |
| `test`     | Avalia o modelo na base SIH-SUS e exibe resultados de acerto (MAE, acurácia) |
| `api-key`  | Gera uma nova chave de API (exibida uma única vez) |
| `serve`    | Sobe a API REST (FastAPI) na porta 8000 |
| `status`   | Status das tabelas do banco |

### 2.1 Argumentos gerais

| Argumento      | Padrão | Descrição |
|----------------|--------|-----------|
| `--mode`       | `full` | Modo: `full`, `download`, `train`, `predict`, `test`, `status` |
| `--db-path`    | `data/drg_br.db` | Caminho do banco SQLite |
| `--model-dir` | `models` | Diretório dos modelos (treino e predição) |
| `--states`     | `['ES']` | Uma ou mais UFs (ex.: `ES SP MG`) |
| `--years`      | (depende do modo) | Anos (ex.: `2022 2023 2024`) |
| `--months`     | todos   | Meses (1–12); raramente usado |
| `--force`      | —       | Flag: forçar re-execução (ex.: re-download) |
| `--limit`      | —       | Limitar número de registros no treino |
| `--device`     | `auto`  | Device PyTorch: `auto`, `cpu`, `cuda`, `mps` |
| `--epochs`     | (config) | Número de épocas (sobrescreve config) |
| `--batch-size` | (config) | Tamanho do batch (sobrescreve config) |

---

### 2.2 Modo `status`

Verifica se o banco tem dados e se está pronto para treino.

**Exemplo:**

```bash
python main.py --mode status
```

**Exemplo com banco em outro caminho:**

```bash
python main.py --mode status --db-path /caminho/meu_banco.db
```

**Saída típica:** contagem de registros por tabela (`cid10`, `sigtap`, `cc_mcc`, `sih_internacoes`) e mensagem indicando se pode rodar treino.

---

### 2.3 Modo `download`

Baixa as bases (CID-10, SIGTAP, CC/MCC, SIH-SUS) e popula o SQLite. O CC/MCC é carregado de `data/cc_mcc_sources/msdrg_v41_cc_mcc.json`; se não existir, o script tenta gerar (via `scripts/fetch_cc_mcc_from_cms.py`).

**Exemplos:**

```bash
# Um estado, dois anos (default de states = ES)
python main.py --mode download --years 2023 2024

# Vários estados, vários anos
python main.py --mode download --states ES SP MG --years 2022 2023 2024

# Forçar novo download mesmo com dados já no banco
python main.py --mode download --states ES --years 2023 --force

# Banco em outro caminho
python main.py --mode download --db-path data/outro.db --states RJ --years 2024
```

**Observação:** dados do DATASUS costumam ter atraso; para 2025 pode ainda não haver arquivos.

---

### 2.4 Modo `train`

Treina o pipeline (modelo neural + GBM + ensemble) a partir dos dados do SQLite. Exige `sih_internacoes` com registros e, idealmente, `cc_mcc` preenchido.

**Exemplos:**

```bash
# Treino com todos os dados do banco
python main.py --mode train

# Treino limitado (útil para teste rápido)
python main.py --mode train --limit 10000
python main.py --mode train --limit 500000

# Usar outro banco e outra pasta de modelos
python main.py --mode train --db-path data/outro.db --model-dir modelos_v2

# Ajustar épocas e batch
python main.py --mode train --epochs 80 --batch-size 1024

# Forçar CPU
python main.py --mode train --device cpu
```

**Saída:** logs de treino (neural, GBM, ensemble), métricas de validação/teste e salvamento em `--model-dir` (default: `models`).

---

### 2.5 Modo `predict`

Carrega os modelos de `--model-dir` e roda predições para casos de exemplo (definidos no código). Útil para validar o pipeline após o treino.

**Exemplos:**

```bash
python main.py --mode predict

python main.py --mode predict --model-dir models
```

**Saída:** para cada exemplo, exibe DRG-BR, MDC, tipo, severidade e as predições (LOS, custos, P(óbito), P(evento adverso), P(UTI), LOS UTI).

---

### 2.6 Modo `test`

Avalia o modelo treinado em uma amostra da base SIH-SUS e exibe **resultados de acerto**: MAE/RMSE para LOS (e custo/LOS UTI quando houver variância), acurácia e recall para óbito, evento adverso e UTI.

**Exemplos:**

```bash
python main.py --mode test --model-dir models
python main.py --mode test --limit 5000
```

**Saída:** relatório com MAE (dias) para LOS, acurácia para classificação e recall para óbito/UTI.

---

### 2.7 Modo `full`

Executa em sequência: primeiro `download`, depois `train`. Mesmos argumentos de `download` e de `train` (states, years, limit, etc.).

**Exemplos:**

```bash
python main.py --mode full --states ES --years 2023 2024

python main.py --mode full --states ES SP --years 2023 --limit 100000 --epochs 40
```

---

## 3. Script auxiliar: CC/MCC (MS-DRG)

Gera o arquivo JSON de códigos CC/MCC usado pelo download para popular a tabela `cc_mcc`.

**Comando:**

```bash
python scripts/fetch_cc_mcc_from_cms.py
```

**Efeito:** Cria/sobrescreve `data/cc_mcc_sources/msdrg_v41_cc_mcc.json`. Se o CMS não for acessível, grava uma amostra embutida (MCC/CC).

**Quando usar:** Antes do primeiro `download` (se o JSON ainda não existir) ou para atualizar a lista de códigos.

---

## 4. Fluxos típicos

### 4.1 Primeira vez (do zero)

```bash
# 1. Ambiente
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# 2. (Opcional) Gerar lista CC/MCC
python scripts/fetch_cc_mcc_from_cms.py

# 3. Download (ex.: ES, 2023 e 2024)
python main.py --mode download --states ES --years 2023 2024

# 4. Verificar banco
python main.py --mode status

# 5. Treino (ex.: com limite para teste)
python main.py --mode train --limit 500000

# 6. Predição de exemplo
python main.py --mode predict --model-dir models
```

### 4.2 Só treino (banco já pronto)

```bash
python main.py --mode train
# ou com limite:
python main.py --mode train --limit 100000
```

### 4.3 Só predição (modelos já treinados)

```bash
python main.py --mode predict --model-dir models
```

### 4.4 Re-download para repopular com novos campos

Se o banco foi populado antes do mapeamento de VAL_TOT/UTI/etc., pode re-downloadar para preencher custos e UTI:

```bash
python main.py --mode download --states ES --years 2023 2024 --force
```

---

## 5. Resumo rápido

| Objetivo              | Comando |
|-----------------------|--------|
| Ver status do banco   | `python main.py --mode status` |
| Baixar dados          | `python main.py --mode download --states ES --years 2023 2024` |
| Treinar               | `python main.py --mode train` |
| Treino rápido (10k)   | `python main.py --mode train --limit 10000` |
| Predição              | `python main.py --mode predict` |
| Download + treino     | `python main.py --mode full --states ES --years 2023` |
| Gerar CC/MCC          | `python scripts/fetch_cc_mcc_from_cms.py` |
| Testar modelo (MAE)   | `python main.py --mode test --limit 5000` |
| Gerar chave de API    | `python main.py --mode api-key [--api-key-name "Minha app"]` |
| Subir a API REST      | `python main.py --mode serve [--port 8000]` |

---

## 5.1 API REST e chaves de API

A API expõe predição DRG-BR com autenticação por chave.

### Gerar chave de API

A primeira chave deve ser criada por linha de comando (depois é possível criar outras via API, enviando uma chave válida no header):

```bash
python main.py --mode api-key
# ou com nome
python main.py --mode api-key --api-key-name "Minha aplicação"
```

A chave é exibida **uma única vez**; guarde em local seguro. Chaves ficam em `data/api_keys.db` (hash SHA-256).

### Subir a API

```bash
python main.py --mode serve
# em outra porta ou host
python main.py --mode serve --port 8080 --host 127.0.0.1
```

Variável de ambiente opcional: `DRG_MODEL_DIR` (diretório dos modelos; default: `models`).

### Endpoints

| Método | Rota | Autenticação | Descrição |
|--------|------|--------------|-----------|
| GET | `/health` | Não | Saúde da API |
| POST | `/api/v1/predict` | **X-API-Key** | Predição (CID, procedimento, idade, sexo, urgência) |
| POST | `/api/v1/keys` | Primeira chave: não; demais: **X-API-Key** | Gerar nova chave de API |

### Exemplo de predição (curl)

```bash
# Substitua SUA_CHAVE pela chave gerada
curl -X POST http://localhost:8000/api/v1/predict \
  -H "X-API-Key: SUA_CHAVE" \
  -H "Content-Type: application/json" \
  -d '{"cid_principal": "A41.9", "cids_secundarios": ["J96.0","R65.21"], "idade": 68, "sexo": 1, "urgencia": 1}'
```

Documentação interativa: **http://localhost:8000/docs** (Swagger UI).

---

## 6. Como reduzir o erro médio (MAE)

O erro médio (MAE) do **LOS (dias)** pode ser reduzido com as práticas abaixo.

### 6.1 Já implementado no pipeline

- **Predição de LOS em escala log:** O preditor usa a saída **los_geometrico** (treinada em log(dias+1)) e converte para dias com `expm1`, o que tende a reduzir MAE em distribuições assimétricas. Nenhuma ação extra é necessária.

### 6.2 Mais dados e mais variados

- **Aumentar o volume de treino:** Menos `--limit` ou mais UFs/anos no download (ex.: `--states ES SP MG RJ --years 2021 2022 2023 2024`). Mais dados costumam reduzir overfitting e melhorar MAE.
- **CIDs secundários:** O downloader extrai diagnósticos secundários do Parquet SIH-RD (colunas `DIAG_SECUN_1`, `DIAG_SECUN_2`, `DIAG_SEC_*`, etc.), grava no SQLite em JSON. O processador lê `cids_secundarios` do banco e preenche a lista no DataFrame. Comorbididades (CC/MCC) impactam LOS; com secundários o modelo tende a reduzir o erro. Se o seu Parquet não tiver essas colunas, o campo fica `[]` e o comportamento equivale ao anterior.

### 6.3 Hiperparâmetros e treino

- **Loss Huber (menos sensível a outliers):** Em `config/settings.py`, na classe `ModelConfig`, defina `use_huber_loss=True` e opcionalmente `huber_delta=1.0`. Depois **retreine** o modelo. A loss Huber penaliza menos erros muito grandes e pode melhorar MAE em bases com muitos outliers.
- **Mais épocas / early stopping mais tolerante:** Aumente `epochs` (ex.: 80 ou 100) e/ou `patience` (ex.: 20). Útil se a curva de validação ainda estiver caindo quando o treino para.
- **Capacidade do modelo:** Em `config/settings.py` pode aumentar `shared_hidden_dims` (ex.: `[768, 384, 192]`) ou `regression_head_dims` (ex.: `[128, 64]`). Só vale se houver dados suficientes; com pouco dado pode piorar por overfitting.
- **Learning rate menor:** Reduzir `learning_rate` (ex.: `5e-4`) com mais épocas pode refinar os pesos e reduzir MAE.

### 6.4 Resumo prático

| Ação | Onde | Efeito esperado |
|------|------|-----------------|
| Usar LOS em escala log (já ativo) | Preditor | MAE menor que predição direta em dias |
| Habilitar Huber loss e retreinar | `config/settings.py` → `use_huber_loss=True` | MAE mais estável com outliers |
| Mais dados (UFs, anos) | `--states`, `--years`, sem `--limit` | Melhor generalização e MAE |
| CIDs secundários (já implementado) | Downloader + processor | Melhor severidade → menor erro (se o Parquet tiver DIAG_SECUN_*) |
| Aumentar épocas / patience | `config/settings.py` ou `--epochs` | Aproveitar melhor o treino |

---

## 7. Arquivos gerados

- **Banco:** `data/drg_br.db` (ou o path de `--db-path`)
- **Cache de download:** `data/cache/*.parquet`
- **CC/MCC:** `data/cc_mcc_sources/msdrg_v41_cc_mcc.json`
- **Modelos:** `models/` — `neural_model.pt`, `gbm_model.pkl`, `feature_builder.pkl`, `model_metadata.json`, `cc_mcc.json`, `ensemble_weights.pkl`, `training_metrics.json`
- **Chaves de API (CLI):** `data/api_keys.db` (hashes; usado pelo modo `serve` antigo)
- **Plataforma:** Backend Flask em `app/`, frontend React em `frontend/`

---

## 8. Plataforma Web (Flask, MySQL, React)

A plataforma oferece autenticação, perfis (roles) com permissões, geração de chaves de API por usuário, audit log e cotas de uso da API, extração de dados e treino pela interface, e API de predição com escolha de modelo.

### 8.1 Arquitetura

- **Backend:** Flask (blueprints: auth, users, roles, api_keys, usage, extract, train, predict). Dados de aplicação em **MySQL** (usuários, perfis, chaves, log de uso, cotas, modelos registrados). Dados de treino continuam no **SQLite** (SIH, CID-10, etc.).
- **Frontend:** React (Vite), com login, dashboard, CRUD de usuários e perfis, chaves API, uso da API, extração e treino.
- **Predição:** Endpoint `POST /api/v1/predict` com header `X-API-Key`; parâmetro opcional `model_id` ou `model_name` para escolher o modelo.

### 8.2 Variáveis de ambiente (.env)

Copie `.env.example` para `.env` e ajuste:

| Variável | Descrição |
|----------|-----------|
| `SECRET_KEY` | Chave secreta Flask (produção) |
| `JWT_SECRET_KEY` | Chave para tokens JWT |
| `DATABASE_URL` | MySQL: `mysql+pymysql://root:12345678@localhost:3306/drg_br` |
| `FLASK_ENV` | `development` ou `production` |
| `DRG_DB_PATH` | Caminho do SQLite de dados (ex.: `data/drg_br.db`) |
| `DRG_MODEL_DIR` | Pasta dos modelos (ex.: `models`) |
| `CORS_ORIGINS` | Origens permitidas para CORS (ex.: `http://localhost:3000`) |

### 8.3 Criar o banco MySQL

Antes de subir o backend, crie o banco (se não existir):

```bash
python scripts/create_mysql_db.py
```

O script usa `DATABASE_URL` do `.env` e executa `CREATE DATABASE IF NOT EXISTS drg_br`.

### 8.4 Subir a plataforma

**Backend (Flask):**

```bash
source venv/bin/activate
python run.py
# Ou: flask --app app run --host 0.0.0.0 --port 5001
```

**Frontend (React):**

```bash
cd frontend
npm install
npm run dev
```

Acesse **http://localhost:3000**. Login padrão (após seed): **admin@drgbr.local** / **admin123**.

### 8.5 API de predição (com chave)

Após criar uma chave em **Chaves API** na interface:

```bash
curl -X POST http://localhost:5001/api/v1/predict \
  -H "X-API-Key: SUA_CHAVE" \
  -H "Content-Type: application/json" \
  -d '{"cid_principal": "A41.9", "cids_secundarios": ["J96.0"], "idade": 68, "sexo": 1, "urgencia": 1}'
```

Para usar um modelo específico: `"model_id": 1` ou `"model_name": "default"` no body (ou query string).
