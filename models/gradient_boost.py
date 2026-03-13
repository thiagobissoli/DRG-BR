"""
Modelos GBM (LightGBM) por target para DRG-BR.
"""
import pickle
import numpy as np
from typing import Dict, Optional
from config.settings import REGRESSION_TARGETS, CLASSIFICATION_TARGETS

try:
    import lightgbm as lgb
except ImportError:
    lgb = None


class GBMMultiTarget:
    def __init__(self, backend: str = "lightgbm"):
        self.backend = backend
        self.models: Dict[str, any] = {}

    def fit(self, train_set, val_set) -> Dict:
        from features.feature_builder import FeatureSet
        X_train = train_set.numeric_features
        X_val = val_set.numeric_features
        targets_reg = train_set.targets_regression
        targets_cls = train_set.targets_classification
        metrics = {}
        if targets_reg is not None:
            for i, t in enumerate(REGRESSION_TARGETS):
                if i >= targets_reg.shape[1]:
                    break
                y = targets_reg[:, i]
                model = self._train_one(X_train, y, 'regression')
                self.models[t] = model
                if X_val is not None and val_set.targets_regression is not None and i < val_set.targets_regression.shape[1]:
                    pred = model.predict(X_val)
                    metrics[t] = np.mean((pred - val_set.targets_regression[:, i]) ** 2)
        if targets_cls is not None:
            for i, t in enumerate(CLASSIFICATION_TARGETS):
                if i >= targets_cls.shape[1]:
                    break
                y = targets_cls[:, i]
                model = self._train_one(X_train, y, 'binary')
                self.models[t] = model
        return metrics

    def _train_one(self, X: np.ndarray, y: np.ndarray, objective: str):
        if lgb is None:
            raise ImportError("lightgbm não instalado")
        if objective == 'binary':
            params = {'objective': 'binary', 'metric': 'binary_logloss', 'verbosity': -1}
        else:
            params = {'objective': 'regression', 'metric': 'mse', 'verbosity': -1}
        train_data = lgb.Dataset(X, label=y)
        return lgb.train(params, train_data, num_boost_round=50)

    def predict(self, feature_set) -> Dict[str, np.ndarray]:
        X = feature_set.numeric_features
        out = {}
        for t, model in self.models.items():
            out[t] = model.predict(X)
        return out

    def save(self, filepath: str):
        with open(filepath, 'wb') as f:
            pickle.dump(self.models, f)

    def load(self, filepath: str):
        with open(filepath, 'rb') as f:
            self.models = pickle.load(f)
