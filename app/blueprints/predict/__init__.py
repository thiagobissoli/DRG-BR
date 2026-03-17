"""
Public prediction API: X-API-Key auth, usage log, quota check, delegate to DRG predictor.
Inclui cache LRU de resultados para reduzir tempo em requisições repetidas.
"""
from collections import OrderedDict
from datetime import datetime
from flask import Blueprint, request, jsonify
from sqlalchemy import func

from app.extensions import db
from app.models.api_key import ApiKey, ApiUsageLog, ApiQuota
from app.models.trained_model import TrainedModel

bp = Blueprint("predict", __name__)

# Cache de predictors carregados por model path
_predictor_cache = {}

# Cache LRU de resultados (model_dir, cid, cids_tuple, proc, idade, sexo, urgencia) -> resultado
_PREDICT_RESULT_CACHE: OrderedDict = OrderedDict()
_PREDICT_CACHE_MAXSIZE = 500


def _cache_key(model_dir: str, cid_principal: str, cids_secundarios: tuple, procedimento: str, idade: int, sexo: int, urgencia: int):
    return (model_dir, (cid_principal or "").strip(), tuple(sorted(cids_secundarios or [])), (procedimento or "").strip(), idade, sexo, urgencia)


def _to_serializable(obj):
    """Converte dict com possíveis numpy types para tipos nativos (JSON)."""
    if obj is None:
        return None
    if hasattr(obj, "item"):  # numpy scalar
        return obj.item()
    if isinstance(obj, dict):
        return {k: _to_serializable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_to_serializable(v) for v in obj]
    if isinstance(obj, (str, int, bool, float)):
        return obj
    if hasattr(obj, "tolist"):
        return obj.tolist()
    return obj


def _get_predictor(model_dir: str):
    global _predictor_cache
    if model_dir not in _predictor_cache:
        import sys
        from pathlib import Path
        # Garantir que a raiz do projeto está em sys.path (evita resolver app.models em vez de models/)
        _root = Path(__file__).resolve().parent.parent.parent.parent
        if str(_root) not in sys.path:
            sys.path.insert(0, str(_root))
        from inference.predictor import DRGPredictor
        _predictor_cache[model_dir] = DRGPredictor.load(model_dir)
    return _predictor_cache[model_dir]


def _check_quota(api_key_id: int) -> bool:
    """Return True if under quota (or no quota set). limit_value 0 = unlimited."""
    today = datetime.utcnow().date()
    q = ApiQuota.query.filter_by(api_key_id=api_key_id, limit_type="requests_per_day").first()
    if not q:
        return True
    if q.limit_value == 0:
        return True  # ilimitado
    count = ApiUsageLog.query.filter(
        ApiUsageLog.api_key_id == api_key_id,
        func.date(ApiUsageLog.requested_at) == today,
    ).count()
    return count < q.limit_value


def _log_usage(api_key_id: int, endpoint: str, method: str, status_code: int, response_time_ms: int = None):
    log = ApiUsageLog(
        api_key_id=api_key_id, endpoint=endpoint, method=method,
        status_code=status_code, response_time_ms=response_time_ms,
    )
    db.session.add(log)
    key = ApiKey.query.get(api_key_id)
    if key:
        key.last_used_at = datetime.utcnow()
    db.session.commit()


def _extract_api_key():
    """Obtém a chave API do header X-API-Key, do body JSON ou de Authorization: Bearer."""
    raw = request.headers.get("X-API-Key")
    if not raw:
        body = request.get_json(silent=True) or {}
        raw = body.get("api_key")
    if not raw and request.headers.get("Authorization"):
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            raw = auth[7:]
    if raw is not None:
        raw = str(raw).strip().replace("\r", "").replace("\n", "").replace("\x00", "")
    return raw or None


@bp.route("/predict", methods=["POST"])
def predict():
    api_key_raw = _extract_api_key()
    if not api_key_raw:
        return jsonify({"error": "X-API-Key header required"}), 401
    key_obj = ApiKey.validate(api_key_raw)
    if not key_obj:
        return jsonify({"error": "Invalid API key"}), 403
    if not _check_quota(key_obj.id):
        _log_usage(key_obj.id, "/api/v1/predict", "POST", 429)
        return jsonify({"error": "Quota exceeded (requests per day)"}), 429

    t0 = datetime.utcnow()
    data = request.get_json(silent=True) or {}
    model_id = data.get("model_id") or request.args.get("model_id")
    model_name = data.get("model_name") or request.args.get("model_name")
    model_dir = None
    if model_id:
        m = TrainedModel.query.get(int(model_id))
        model_dir = m.path if m else None
    elif model_name:
        m = TrainedModel.query.filter_by(name=model_name).first()
        model_dir = m.path if m else None
    if not model_dir:
        from flask import current_app
        model_dir = current_app.config.get("DRG_MODEL_DIR", "models")

    cid_principal = (data.get("cid_principal") or "").strip()
    cids_secundarios = data.get("cids_secundarios") or []
    procedimento_sigtap = (data.get("procedimento_sigtap") or "").strip()
    idade = int(data.get("idade", 50))
    sexo = int(data.get("sexo", 0))
    urgencia = int(data.get("urgencia", 1))
    cache_key = _cache_key(model_dir, cid_principal, tuple(cids_secundarios), procedimento_sigtap, idade, sexo, urgencia)

    try:
        if cache_key in _PREDICT_RESULT_CACHE:
            _PREDICT_RESULT_CACHE.move_to_end(cache_key)
            elapsed = int((datetime.utcnow() - t0).total_seconds() * 1000)
            _log_usage(key_obj.id, "/api/v1/predict", "POST", 200, response_time_ms=elapsed)
            return jsonify(_PREDICT_RESULT_CACHE[cache_key])

        predictor = _get_predictor(model_dir)
        result = predictor.predict(
            cid_principal=cid_principal,
            cids_secundarios=list(cids_secundarios),
            procedimento_sigtap=procedimento_sigtap,
            idade=idade,
            sexo=sexo,
            urgencia=urgencia,
        )
        result_serializable = _to_serializable(result)
        _PREDICT_RESULT_CACHE[cache_key] = result_serializable
        if len(_PREDICT_RESULT_CACHE) > _PREDICT_CACHE_MAXSIZE:
            _PREDICT_RESULT_CACHE.popitem(last=False)

        elapsed = int((datetime.utcnow() - t0).total_seconds() * 1000)
        _log_usage(key_obj.id, "/api/v1/predict", "POST", 200, response_time_ms=elapsed)
        return jsonify(result_serializable)
    except Exception as e:
        _log_usage(key_obj.id, "/api/v1/predict", "POST", 500)
        return jsonify({"error": str(e)}), 500


@bp.route("/models", methods=["GET"])
def list_models():
    """List available models (no auth required for listing; prediction requires API key)."""
    models = TrainedModel.query.order_by(TrainedModel.created_at.desc()).all()
    return jsonify([{"id": m.id, "name": m.name, "path": m.path, "is_default": m.is_default, "created_at": m.created_at.isoformat() if m.created_at else None} for m in models])
