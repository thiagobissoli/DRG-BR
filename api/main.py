"""
API REST DRG-BR — predição de LOS, custos, óbito, evento adverso e UTI.
Autenticação via chave de API (header X-API-Key).
"""
import os
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, Header, HTTPException, Depends
from pydantic import BaseModel, Field

# Importação do predictor (caminho do projeto)
ROOT = Path(__file__).resolve().parent.parent
import sys
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from api.auth import APIKeyStore, DEFAULT_DB_PATH

app = FastAPI(
    title="DRG-BR API",
    description="Predição de permanência, custos e eventos para internações (DRG-BR)",
    version="1.0",
)

# Store de chaves (mesmo arquivo usado pelo CLI)
_key_store: Optional[APIKeyStore] = None

def get_key_store() -> APIKeyStore:
    global _key_store
    if _key_store is None:
        _key_store = APIKeyStore()
    return _key_store


def require_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> str:
    """Dependency: exige header X-API-Key válido."""
    if not x_api_key or not x_api_key.strip():
        raise HTTPException(status_code=401, detail="Header X-API-Key ausente")
    store = get_key_store()
    if not store.validate(x_api_key):
        raise HTTPException(status_code=403, detail="Chave de API inválida")
    return x_api_key


# --- Modelos de request/response ---

class PredictRequest(BaseModel):
    cid_principal: str = Field(..., description="CID-10 principal (ex: I21.0, A41.9)")
    cids_secundarios: List[str] = Field(default_factory=list, description="Lista de CIDs secundários")
    procedimento_sigtap: str = Field("", description="Código do procedimento SIGTAP")
    idade: int = Field(50, ge=0, le=120, description="Idade em anos")
    sexo: int = Field(0, description="0=F, 1=M")
    urgencia: int = Field(1, description="1=Urgência, 0=Eletivo")


# Predictor carregado sob demanda (lazy)
_predictor = None

def get_predictor():
    global _predictor
    if _predictor is None:
        from inference.predictor import DRGPredictor
        model_dir = os.environ.get("DRG_MODEL_DIR", str(ROOT / "models"))
        _predictor = DRGPredictor.load(model_dir)
    return _predictor


# --- Rotas ---

@app.get("/health")
def health():
    """Saúde da API (sem autenticação)."""
    return {"status": "ok", "service": "drg-br"}


@app.post("/api/v1/predict", response_model=dict)
def predict(
    body: PredictRequest,
    _api_key: str = Depends(require_api_key),
):
    """
    Predição DRG-BR: retorna DRG, MDC, severidade, LOS, custos, P(óbito), P(evento adverso), P(UTI), LOS UTI.
    """
    predictor = get_predictor()
    result = predictor.predict(
        cid_principal=body.cid_principal,
        cids_secundarios=body.cids_secundarios or [],
        procedimento_sigtap=body.procedimento_sigtap or "",
        idade=body.idade,
        sexo=body.sexo,
        urgencia=body.urgencia,
    )
    return result


@app.post("/api/v1/keys")
def create_key(
    name: Optional[str] = None,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
):
    """
    Gera uma nova chave de API. Para a primeira chave do sistema, não envie X-API-Key.
    Depois, use uma chave válida no header. A nova chave é retornada uma única vez.
    """
    store = get_key_store()
    # Bootstrap: se já existir alguma chave, exige uma válida para criar outra
    keys = store.list_keys()
    if keys and (not x_api_key or not store.validate(x_api_key)):
        raise HTTPException(status_code=403, detail="Chave de API inválida ou ausente")
    key = store.generate(name=name)
    return {"api_key": key, "name": name or "", "message": "Guarde a chave em local seguro; ela não será exibida novamente."}
