"""
DRG-BR: Trainer - loop de treinamento completo.
"""
import torch
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
from typing import Dict, Optional, Tuple
import time
import copy
import logging

from config.settings import MODEL_CFG, REGRESSION_TARGETS, CLASSIFICATION_TARGETS
from models.multi_target_model import DRGBRModel
from models.gradient_boost import GBMMultiTarget
from models.ensemble import DRGEnsemble
from training.losses import MultiTaskLoss
from training.metrics import evaluate_all, print_metrics
from features.feature_builder import FeatureSet

logger = logging.getLogger(__name__)


class DRGTrainer:
    def __init__(self, config=None, device: str = "auto"):
        self.cfg = config or MODEL_CFG
        if device == "auto":
            self.device = torch.device("cuda" if torch.cuda.is_available()
                                       else "mps" if torch.backends.mps.is_available()
                                       else "cpu")
        else:
            self.device = torch.device(device)
        logger.info(f"Device: {self.device}")
        self.neural_model: Optional[DRGBRModel] = None
        self.gbm_model: Optional[GBMMultiTarget] = None
        self.ensemble: Optional[DRGEnsemble] = None
        self.best_metrics: Dict = {}

    def _create_dataloader(self, feature_set: FeatureSet, shuffle: bool = True) -> DataLoader:
        tensors = [
            torch.LongTensor(feature_set.cid_principal_idx),
            torch.LongTensor(feature_set.cids_secundarios_idx),
            torch.LongTensor(feature_set.procedimento_idx),
            torch.LongTensor(feature_set.mdc_idx),
            torch.FloatTensor(feature_set.numeric_features),
        ]
        if feature_set.targets_regression is not None:
            tensors.append(torch.FloatTensor(feature_set.targets_regression))
        if feature_set.targets_classification is not None:
            tensors.append(torch.FloatTensor(feature_set.targets_classification))
        dataset = TensorDataset(*tensors)
        return DataLoader(dataset, batch_size=self.cfg.batch_size, shuffle=shuffle, num_workers=0)

    def train_neural(
        self, train_set: FeatureSet, val_set: FeatureSet,
        cid_vocab_size: int, sigtap_vocab_size: int,
    ) -> Dict:
        logger.info("="*60)
        logger.info("  TREINAMENTO DO MODELO NEURAL")
        logger.info("="*60)
        n_numeric = train_set.numeric_features.shape[1]
        self.neural_model = DRGBRModel(
            cid_vocab_size=cid_vocab_size,
            sigtap_vocab_size=sigtap_vocab_size,
            n_numeric_features=n_numeric,
            config=self.cfg,
        ).to(self.device)
        logger.info(f"Parâmetros: {self.neural_model.count_parameters():,}")
        criterion = MultiTaskLoss(use_uncertainty=True, config=self.cfg).to(self.device)
        optimizer = optim.AdamW(
            list(self.neural_model.parameters()) + list(criterion.parameters()),
            lr=self.cfg.learning_rate,
            weight_decay=self.cfg.weight_decay,
        )
        scheduler = optim.lr_scheduler.CosineAnnealingWarmRestarts(optimizer, T_0=10, T_mult=2)
        train_loader = self._create_dataloader(train_set, shuffle=True)
        val_loader = self._create_dataloader(val_set, shuffle=False)
        best_val_loss = float('inf')
        best_state = None
        patience_counter = 0
        history = {'train_loss': [], 'val_loss': []}
        for epoch in range(self.cfg.epochs):
            t0 = time.time()
            self.neural_model.train()
            train_losses = []
            for batch in train_loader:
                cid_p, cids_s, proc, mdc, numeric, targets_r, targets_c = [b.to(self.device) for b in batch]
                optimizer.zero_grad()
                preds = self.neural_model(cid_p, cids_s, proc, mdc, numeric)
                losses = criterion(preds, targets_r, targets_c)
                losses['total'].backward()
                torch.nn.utils.clip_grad_norm_(self.neural_model.parameters(), max_norm=1.0)
                optimizer.step()
                train_losses.append(losses['total'].item())
            scheduler.step()
            self.neural_model.eval()
            val_losses = []
            with torch.no_grad():
                for batch in val_loader:
                    cid_p, cids_s, proc, mdc, numeric, targets_r, targets_c = [b.to(self.device) for b in batch]
                    preds = self.neural_model(cid_p, cids_s, proc, mdc, numeric)
                    losses = criterion(preds, targets_r, targets_c)
                    val_losses.append(losses['total'].item())
            train_loss = np.mean(train_losses)
            val_loss = np.mean(val_losses)
            history['train_loss'].append(train_loss)
            history['val_loss'].append(val_loss)
            elapsed = time.time() - t0
            if (epoch + 1) % 5 == 0 or epoch == 0:
                logger.info(f"Epoch {epoch+1:3d}/{self.cfg.epochs} │ Train: {train_loss:.4f} │ Val: {val_loss:.4f} │ {elapsed:.1f}s")
            if val_loss < best_val_loss - self.cfg.min_delta:
                best_val_loss = val_loss
                best_state = copy.deepcopy(self.neural_model.state_dict())
                patience_counter = 0
            else:
                patience_counter += 1
                if patience_counter >= self.cfg.patience:
                    logger.info(f"Early stopping na epoch {epoch+1}")
                    break
        if best_state:
            self.neural_model.load_state_dict(best_state)
        logger.info(f"Melhor val loss: {best_val_loss:.4f}")
        return history

    def train_gbm(self, train_set: FeatureSet, val_set: FeatureSet, backend: str = "lightgbm") -> Dict:
        logger.info("="*60)
        logger.info(f"  TREINAMENTO GBM ({backend.upper()})")
        logger.info("="*60)
        self.gbm_model = GBMMultiTarget(backend=backend)
        metrics = self.gbm_model.fit(train_set, val_set)
        return metrics

    def predict_neural(self, feature_set: FeatureSet) -> Dict[str, np.ndarray]:
        self.neural_model.eval()
        loader = self._create_dataloader(feature_set, shuffle=False)
        all_preds = {t: [] for t in REGRESSION_TARGETS + CLASSIFICATION_TARGETS}
        with torch.no_grad():
            for batch in loader:
                cid_p, cids_s, proc, mdc, numeric = [b.to(self.device) for b in batch[:5]]
                preds = self.neural_model(cid_p, cids_s, proc, mdc, numeric)
                for target, values in preds.items():
                    all_preds[target].append(values.cpu().numpy())
        return {t: np.concatenate(v) for t, v in all_preds.items() if v}

    def evaluate(self, feature_set: FeatureSet, model_type: str = "ensemble") -> Dict:
        if model_type == "neural" and self.neural_model:
            preds = self.predict_neural(feature_set)
        elif model_type == "gbm" and self.gbm_model:
            preds = self.gbm_model.predict(feature_set)
        elif model_type == "ensemble" and self.ensemble:
            preds_nn = self.predict_neural(feature_set) if self.neural_model else {}
            preds_gbm = self.gbm_model.predict(feature_set) if self.gbm_model else {}
            all_preds = {'neural': preds_nn, 'gbm': preds_gbm}
            preds = self.ensemble.predict(all_preds)
        else:
            raise ValueError(f"Modelo '{model_type}' não disponível.")
        return evaluate_all(preds, feature_set.targets_regression, feature_set.targets_classification)

    def train_full_pipeline(
        self, train_set: FeatureSet, val_set: FeatureSet, test_set: FeatureSet,
        cid_vocab_size: int, sigtap_vocab_size: int,
    ) -> Dict:
        results = {}
        try:
            history = self.train_neural(train_set, val_set, cid_vocab_size, sigtap_vocab_size)
            results['neural_history'] = history
            if val_set.targets_regression is not None or val_set.targets_classification is not None:
                nn_metrics = self.evaluate(val_set, "neural")
                results['neural_val'] = nn_metrics
                print_metrics(nn_metrics, "NEURAL - Validação")
        except Exception as e:
            logger.error(f"Erro no treinamento neural: {e}")
        try:
            self.train_gbm(train_set, val_set)
            if val_set.targets_regression is not None or val_set.targets_classification is not None:
                gbm_eval = self.evaluate(val_set, "gbm")
                results['gbm_val'] = gbm_eval
                print_metrics(gbm_eval, "GBM - Validação")
        except Exception as e:
            logger.error(f"Erro no treinamento GBM: {e}")
        if self.neural_model and self.gbm_model and val_set.targets_regression is not None:
            self.ensemble = DRGEnsemble(strategy="weighted")
            preds_nn = self.predict_neural(val_set)
            preds_gbm = self.gbm_model.predict(val_set)
            true_vals = {}
            for i, t in enumerate(REGRESSION_TARGETS):
                if val_set.targets_regression is not None and i < val_set.targets_regression.shape[1]:
                    true_vals[t] = val_set.targets_regression[:, i]
            for i, t in enumerate(CLASSIFICATION_TARGETS):
                if val_set.targets_classification is not None and i < val_set.targets_classification.shape[1]:
                    true_vals[t] = val_set.targets_classification[:, i]
            if true_vals:
                self.ensemble.optimize_weights({'neural': preds_nn, 'gbm': preds_gbm}, true_vals)
                ensemble_metrics = self.evaluate(val_set, "ensemble")
                results['ensemble_val'] = ensemble_metrics
                print_metrics(ensemble_metrics, "ENSEMBLE - Validação")
        model_type = "ensemble" if self.ensemble else ("neural" if self.neural_model else "gbm")
        if test_set.targets_regression is not None or test_set.targets_classification is not None:
            test_metrics = self.evaluate(test_set, model_type)
            results['test'] = test_metrics
            print_metrics(test_metrics, f"TESTE FINAL ({model_type.upper()})")
        self.best_metrics = results
        return results

    def save_models(self, dir_path: str, cid_vocab_size: int = 0, sigtap_vocab_size: int = 0, n_numeric_features: int = 0):
        from pathlib import Path
        import pickle
        import json
        path = Path(dir_path)
        path.mkdir(parents=True, exist_ok=True)
        if self.neural_model:
            torch.save(self.neural_model.state_dict(), path / "neural_model.pt")
            logger.info(f"  neural_model.pt salvo")
        if self.gbm_model:
            self.gbm_model.save(str(path / "gbm_model.pkl"))
            logger.info(f"  gbm_model.pkl salvo")
        if self.ensemble:
            with open(path / "ensemble_weights.pkl", 'wb') as f:
                pickle.dump(self.ensemble.weights, f)
        metadata = {
            'cid_vocab_size': cid_vocab_size,
            'sigtap_vocab_size': sigtap_vocab_size,
            'n_numeric_features': n_numeric_features,
            'n_mdc': 26,
            'config': {
                'cid_embedding_dim': self.cfg.cid_embedding_dim,
                'sigtap_embedding_dim': self.cfg.sigtap_embedding_dim,
                'mdc_embedding_dim': self.cfg.mdc_embedding_dim,
                'shared_hidden_dims': self.cfg.shared_hidden_dims,
                'dropout_rate': self.cfg.dropout_rate,
                'regression_head_dims': self.cfg.regression_head_dims,
                'classification_head_dims': self.cfg.classification_head_dims,
            },
            'regression_targets': REGRESSION_TARGETS,
            'classification_targets': CLASSIFICATION_TARGETS,
            'has_neural': self.neural_model is not None,
            'has_gbm': self.gbm_model is not None,
            'has_ensemble': self.ensemble is not None,
        }
        with open(path / "model_metadata.json", 'w') as f:
            json.dump(metadata, f, indent=2)
        if self.best_metrics:
            def _sanitize(obj):
                if isinstance(obj, (np.integer,)): return int(obj)
                elif isinstance(obj, (np.floating,)): return float(obj)
                elif isinstance(obj, np.ndarray): return obj.tolist()
                elif isinstance(obj, dict): return {k: _sanitize(v) for k, v in obj.items()}
                elif isinstance(obj, list): return [_sanitize(v) for v in obj]
                return obj
            with open(path / "training_metrics.json", 'w') as f:
                json.dump(_sanitize(self.best_metrics), f, indent=2)
        logger.info(f"Todos os artefatos salvos em {path}")
