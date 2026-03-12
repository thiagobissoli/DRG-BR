"""
Processamento assíncrono com pool de workers limitado.
Evita spawn ilimitado de threads e mantém a API responsiva.
"""
import logging
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

# Máximo 2 extrações simultâneas (I/O e CPU moderado)
_extract_executor: ThreadPoolExecutor | None = None
_EXTRACT_MAX_WORKERS = 2

# Máximo 1 treino simultâneo (subprocess pesado)
_train_executor: ThreadPoolExecutor | None = None
_TRAIN_MAX_WORKERS = 1


def _get_extract_executor() -> ThreadPoolExecutor:
    global _extract_executor
    if _extract_executor is None:
        _extract_executor = ThreadPoolExecutor(max_workers=_EXTRACT_MAX_WORKERS, thread_name_prefix="extract")
        logger.info("Extract executor started (max_workers=%s)", _EXTRACT_MAX_WORKERS)
    return _extract_executor


def _get_train_executor() -> ThreadPoolExecutor:
    global _train_executor
    if _train_executor is None:
        _train_executor = ThreadPoolExecutor(max_workers=_TRAIN_MAX_WORKERS, thread_name_prefix="train")
        logger.info("Train executor started (max_workers=%s)", _TRAIN_MAX_WORKERS)
    return _train_executor


def submit_extract(fn, *args, **kwargs):
    """Enfileira tarefa de extração. Retorna imediatamente."""
    return _get_extract_executor().submit(fn, *args, **kwargs)


def submit_train(fn, *args, **kwargs):
    """Enfileira tarefa de treino. Retorna imediatamente."""
    return _get_train_executor().submit(fn, *args, **kwargs)


def shutdown_executors():
    """Encerra os executors (útil em testes ou shutdown graceful)."""
    global _extract_executor, _train_executor
    for ex in (_extract_executor, _train_executor):
        if ex is not None:
            ex.shutdown(wait=False)
    _extract_executor = None
    _train_executor = None
