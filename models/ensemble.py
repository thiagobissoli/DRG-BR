"""
Ensemble ponderado Neural + GBM.
"""
import numpy as np
from typing import Dict
from config.settings import REGRESSION_TARGETS, CLASSIFICATION_TARGETS


class DRGEnsemble:
    def __init__(self, strategy: str = "weighted"):
        self.strategy = strategy
        self.weights: Dict[str, Dict[str, float]] = {}
        self._fitted = False

    def optimize_weights(self, preds: Dict[str, Dict[str, np.ndarray]], true_vals: Dict[str, np.ndarray]):
        """Ajusta pesos por target (média simples 0.5/0.5 se neural e gbm)."""
        self.weights = {}
        for t in REGRESSION_TARGETS + CLASSIFICATION_TARGETS:
            if t not in true_vals:
                continue
            y = true_vals[t]
            best_w = 0.5
            best_err = 1e18
            for w in [0.0, 0.25, 0.5, 0.75, 1.0]:
                pn = preds.get('neural', {}).get(t)
                pg = preds.get('gbm', {}).get(t)
                if pn is not None and pg is not None:
                    pred = w * np.array(pn) + (1 - w) * np.array(pg)
                elif pn is not None:
                    pred = np.array(pn)
                elif pg is not None:
                    pred = np.array(pg)
                else:
                    continue
                err = np.mean((pred - y) ** 2)
                if err < best_err:
                    best_err = err
                    best_w = w
            self.weights[t] = {'neural': best_w, 'gbm': 1.0 - best_w}
        self._fitted = True

    def predict(self, all_preds: Dict[str, Dict[str, np.ndarray]]) -> Dict[str, np.ndarray]:
        out = {}
        for t in REGRESSION_TARGETS + CLASSIFICATION_TARGETS:
            pn = all_preds.get('neural', {}).get(t)
            pg = all_preds.get('gbm', {}).get(t)
            w = self.weights.get(t, {'neural': 0.5, 'gbm': 0.5})
            if pn is not None and pg is not None:
                out[t] = w['neural'] * np.array(pn) + w['gbm'] * np.array(pg)
            elif pn is not None:
                out[t] = np.array(pn)
            elif pg is not None:
                out[t] = np.array(pg)
        return out
