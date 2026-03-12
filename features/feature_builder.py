"""
DRG-BR: Construtor de features para o modelo.
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import logging
import pickle

from preprocessing.cid_processor import CIDProcessor
from preprocessing.sigtap_processor import SIGTAPProcessor
from features.drg_grouper import DRGGrouper
from config.settings import DATA_CFG, ALL_TARGETS, REGRESSION_TARGETS, CLASSIFICATION_TARGETS

logger = logging.getLogger(__name__)


@dataclass
class FeatureSet:
    """Container para features processadas."""
    cid_principal_idx: np.ndarray
    cids_secundarios_idx: np.ndarray
    procedimento_idx: np.ndarray
    mdc_idx: np.ndarray
    numeric_features: np.ndarray
    targets_regression: Optional[np.ndarray] = None
    targets_classification: Optional[np.ndarray] = None
    feature_names: Optional[List[str]] = None
    n_samples: int = 0


class FeatureBuilder:
    def __init__(
        self,
        cid_processor: Optional[CIDProcessor] = None,
        sigtap_processor: Optional[SIGTAPProcessor] = None,
        max_cids_secundarios: int = 15,
    ):
        self.cid_proc = cid_processor or CIDProcessor()
        self.sigtap_proc = sigtap_processor or SIGTAPProcessor()
        self.drg_grouper = DRGGrouper()
        self.max_cids = max_cids_secundarios
        self._fitted = False
        self._numeric_mean: Optional[np.ndarray] = None
        self._numeric_std: Optional[np.ndarray] = None

    def fit(self, df: pd.DataFrame) -> 'FeatureBuilder':
        all_cids = df['cid_principal'].tolist()
        for cids in df['cids_secundarios']:
            if isinstance(cids, list):
                all_cids.extend(cids)
        self.cid_proc.fit(all_cids)
        self.sigtap_proc.fit(df['procedimento'].tolist())
        numeric_df = self._extract_numeric(df)
        self._numeric_mean = numeric_df.mean().values.copy()
        self._numeric_std = numeric_df.std().values.copy()
        if self._numeric_std is not None:
            self._numeric_std = self._numeric_std.copy()
            self._numeric_std[self._numeric_std < 1e-8] = 1.0
        self._numeric_cols = numeric_df.columns.tolist()
        self._fitted = True
        logger.info(f"FeatureBuilder ajustado. CID vocab: {self.cid_proc.vocab_size}, SIGTAP vocab: {self.sigtap_proc.vocab_size}, Numeric: {len(self._numeric_cols)}")
        return self

    def transform(self, df: pd.DataFrame, include_targets: bool = True) -> FeatureSet:
        if not self._fitted:
            raise RuntimeError("FeatureBuilder não foi ajustado. Chame fit() primeiro.")
        n = len(df)
        logger.info(f"Transformando {n:,} registros...")
        cid_principal_idx = np.array([self.cid_proc.encode(cid) for cid in df['cid_principal']], dtype=np.int32)
        cids_sec_idx = np.zeros((n, self.max_cids), dtype=np.int32)
        for i in range(n):
            row = df.iloc[i]
            cids = row.get('cids_secundarios', [])
            if isinstance(cids, list):
                cids_sec_idx[i] = self.cid_proc.encode_multiple(cids, self.max_cids)
        proc_idx = np.array([self.sigtap_proc.encode(p) for p in df['procedimento']], dtype=np.int32)
        drg_features = []
        mdc_idx = np.zeros(n, dtype=np.int32)
        for i in range(n):
            row = df.iloc[i]
            cids_sec = row.get('cids_secundarios', [])
            if not isinstance(cids_sec, list):
                cids_sec = []
            drg_feat = self.drg_grouper.get_numeric_features(
                cid_principal=row['cid_principal'],
                cids_secundarios=cids_sec,
                procedimento=row.get('procedimento', ''),
            )
            drg_features.append(drg_feat)
            mdc_idx[i] = drg_feat['mdc_code']
        drg_df = pd.DataFrame(drg_features)
        numeric_df = self._extract_numeric(df)
        for col in drg_df.columns:
            if col != 'mdc_code':
                numeric_df[col] = drg_df[col].values
        numeric_arr = numeric_df.values.astype(np.float32)
        if self._numeric_mean is not None:
            mean = np.zeros(numeric_arr.shape[1])
            std = np.ones(numeric_arr.shape[1])
            n_common = min(len(self._numeric_mean), numeric_arr.shape[1])
            mean[:n_common] = self._numeric_mean[:n_common]
            std[:n_common] = np.array(self._numeric_std[:n_common], dtype=np.float64).copy()
            numeric_arr = (numeric_arr - mean) / std
        numeric_arr = np.nan_to_num(numeric_arr, nan=0.0)
        targets_reg = None
        targets_cls = None
        if include_targets:
            reg_cols = [c for c in REGRESSION_TARGETS if c in df.columns]
            cls_cols = [c for c in CLASSIFICATION_TARGETS if c in df.columns]
            if reg_cols:
                targets_reg = df[reg_cols].values.astype(np.float32)
                targets_reg = np.nan_to_num(targets_reg, nan=0.0)
            if cls_cols:
                targets_cls = df[cls_cols].values.astype(np.float32)
                targets_cls = np.nan_to_num(targets_cls, nan=0.0)
        return FeatureSet(
            cid_principal_idx=cid_principal_idx,
            cids_secundarios_idx=cids_sec_idx,
            procedimento_idx=proc_idx,
            mdc_idx=mdc_idx,
            numeric_features=numeric_arr,
            targets_regression=targets_reg,
            targets_classification=targets_cls,
            feature_names=numeric_df.columns.tolist(),
            n_samples=n,
        )

    def _extract_numeric(self, df: pd.DataFrame) -> pd.DataFrame:
        numeric_cols = []
        for c in ['idade', 'sexo', 'faixa_etaria', 'urgencia', 'n_cids_secundarios']:
            if c in df.columns:
                numeric_cols.append(c)
        available = [c for c in numeric_cols if c in df.columns]
        result = df[available].copy() if available else pd.DataFrame(index=df.index)
        for col in result.columns:
            result[col] = pd.to_numeric(result[col], errors='coerce').fillna(0)
        return result

    def save(self, filepath: str):
        state = {
            'cid_vocab': self.cid_proc.vocab,
            'sigtap_vocab': self.sigtap_proc.vocab,
            'sigtap_group_vocab': self.sigtap_proc.group_vocab,
            'numeric_mean': self._numeric_mean,
            'numeric_std': self._numeric_std,
            'numeric_cols': self._numeric_cols if hasattr(self, '_numeric_cols') else [],
            'max_cids': self.max_cids,
        }
        with open(filepath, 'wb') as f:
            pickle.dump(state, f)
        logger.info(f"FeatureBuilder salvo em {filepath}")

    def load(self, filepath: str):
        with open(filepath, 'rb') as f:
            state = pickle.load(f)
        self.cid_proc.vocab = state['cid_vocab']
        self.cid_proc.reverse_vocab = {v: k for k, v in self.cid_proc.vocab.items()}
        self.cid_proc._fitted = True
        self.sigtap_proc.vocab = state['sigtap_vocab']
        self.sigtap_proc.group_vocab = state.get('group_vocab', state.get('sigtap_group_vocab', {}))
        self.sigtap_proc.reverse_vocab = {v: k for k, v in self.sigtap_proc.vocab.items()}
        self.sigtap_proc._fitted = True
        self._numeric_mean = state['numeric_mean']
        self._numeric_std = np.array(state['numeric_std'], dtype=np.float64).copy() if state.get('numeric_std') is not None else None
        self._numeric_cols = state.get('numeric_cols', [])
        self.max_cids = state['max_cids']
        self._fitted = True
        logger.info(f"FeatureBuilder carregado de {filepath}")
