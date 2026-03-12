"""
Métricas de avaliação para regressão e classificação.
"""
import numpy as np
from typing import Dict
from config.settings import REGRESSION_TARGETS, CLASSIFICATION_TARGETS


def evaluate_all(
    preds: Dict[str, np.ndarray],
    targets_reg: np.ndarray,
    targets_cls: np.ndarray,
) -> Dict:
    results = {}
    if targets_reg is not None:
        for i, t in enumerate(REGRESSION_TARGETS):
            if t not in preds or i >= targets_reg.shape[1]:
                continue
            p = np.array(preds[t]).ravel()
            y = targets_reg[:, i]
            n = min(len(p), len(y))
            if n == 0:
                continue
            p, y = p[:n], y[:n]
            results[t] = {'mse': float(np.mean((p - y) ** 2)), 'mae': float(np.mean(np.abs(p - y)))}
    if targets_cls is not None:
        for i, t in enumerate(CLASSIFICATION_TARGETS):
            if t not in preds or i >= targets_cls.shape[1]:
                continue
            p = np.array(preds[t]).ravel()
            y = targets_cls[:, i]
            n = min(len(p), len(y))
            if n == 0:
                continue
            p, y = p[:n], y[:n]
            pred_bin = (p >= 0.5).astype(float)
            acc = (pred_bin == y).mean()
            results[t] = {'accuracy': float(acc), 'bce': float(np.mean((p - y) ** 2))}
    return results


def print_metrics(metrics: Dict, title: str = "Métricas"):
    print(f"\n  [{title}]")
    for k, v in metrics.items():
        if isinstance(v, dict):
            print(f"    {k}: {v}")
        else:
            print(f"    {k}: {v}")
