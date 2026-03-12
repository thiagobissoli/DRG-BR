"""
DRG-BR: Construtor de features para o modelo.

Monta o vetor de features completo combinando:
- CID-10 embeddings
- SIGTAP embeddings
- MDC features
- CC/MCC flags
- Features demográficas
- Features do DRG Grouper
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
    # Índices para embeddings
    cid_principal_idx: np.ndarray       # (N,)
    cids_secundarios_idx: np.ndarray    # (N, max_cids)
    procedimento_idx: np.ndarray        # (N,)
    mdc_idx: np.ndarray                 # (N,)

    # Features numéricas contínuas/categóricas
    numeric_features: np.ndarray        # (N, n_numeric)

    # Targets
    targets_regression: Optional[np.ndarray] = None  # (N, n_reg_targets)
    targets_classification: Optional[np.ndarray] = None  # (N, n_cls_targets)

    # Metadados
    feature_names: Optional[List[str]] = None
    n_samples: int = 0


class FeatureBuilder:
    """
    Constrói features prontas para o modelo a partir de dados processados.
    """

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

        # Estatísticas para normalização
        self._numeric_mean: Optional[np.ndarray] = None
        self._numeric_std: Optional[np.ndarray] = None

    def fit(self, df: pd.DataFrame) -> 'FeatureBuilder':
        """
        Ajusta processadores e estatísticas no conjunto de treino.
        """
        logger.info("Ajustando FeatureBuilder no dataset de treino...")

        # Fit CID processor
        all_cids = df['cid_principal'].tolist()
        for cids in df['cids_secundarios']:
            if isinstance(cids, list):
                all_cids.extend(cids)
        self.cid_proc.fit(all_cids)

        # Fit SIGTAP processor
        self.sigtap_proc.fit(df['procedimento'].tolist())

        # Calcular estatísticas de normalização
        numeric_df = self._extract_numeric(df)
        self._numeric_mean = numeric_df.mean().values.copy()
        self._numeric_std = numeric_df.std().values.copy()
        self._numeric_std[self._numeric_std < 1e-8] = 1.0  # Evitar divisão por zero
        self._numeric_cols = numeric_df.columns.tolist()

        self._fitted = True
        logger.info(f"FeatureBuilder ajustado. "
                     f"CID vocab: {self.cid_proc.vocab_size}, "
                     f"SIGTAP vocab: {self.sigtap_proc.vocab_size}, "
                     f"Numeric features: {len(self._numeric_cols)}")
        return self

    def transform(self, df: pd.DataFrame, include_targets: bool = True) -> FeatureSet:
        """
        Transforma DataFrame em FeatureSet pronto para o modelo.
        """
        if not self._fitted:
            raise RuntimeError("FeatureBuilder não foi ajustado. Chame fit() primeiro.")

        n = len(df)
        logger.info(f"Transformando {n:,} registros...")

        # 1. Índices CID principal
        cid_principal_idx = np.array(
            [self.cid_proc.encode(cid) for cid in df['cid_principal']],
            dtype=np.int32
        )

        # 2. Índices CIDs secundários (com padding)
        cids_sec_idx = np.zeros((n, self.max_cids), dtype=np.int32)
        for i, cids in enumerate(df['cids_secundarios']):
            if isinstance(cids, list):
                encoded = self.cid_proc.encode_multiple(cids, self.max_cids)
                cids_sec_idx[i] = encoded

        # 3. Índice procedimento
        proc_idx = np.array(
            [self.sigtap_proc.encode(p) for p in df['procedimento']],
            dtype=np.int32
        )

        # 4. Features DRG (MDC, CC/MCC, surgical)
        drg_features = []
        mdc_idx = np.zeros(n, dtype=np.int32)
        for idx, (_, row) in enumerate(df.iterrows()):
            cids_sec = row.get('cids_secundarios', [])
            if not isinstance(cids_sec, list):
                cids_sec = []
            drg_feat = self.drg_grouper.get_numeric_features(
                cid_principal=row['cid_principal'],
                cids_secundarios=cids_sec,
                procedimento=row.get('procedimento', ''),
            )
            drg_features.append(drg_feat)
            mdc_idx[idx] = drg_feat['mdc_code']

        drg_df = pd.DataFrame(drg_features)

        # 5. Features numéricas
        numeric_df = self._extract_numeric(df)

        # Adicionar features DRG
        for col in drg_df.columns:
            if col != 'mdc_code':
                numeric_df[col] = drg_df[col].values

        # Normalizar
        numeric_arr = numeric_df.values.astype(np.float32)
        if self._numeric_mean is not None:
            # Alinhar dimensões (treino pode ter colunas diferentes)
            mean = np.zeros(numeric_arr.shape[1])
            std = np.ones(numeric_arr.shape[1])
            n_common = min(len(self._numeric_mean), numeric_arr.shape[1])
            mean[:n_common] = self._numeric_mean[:n_common]
            std[:n_common] = self._numeric_std[:n_common]
            numeric_arr = (numeric_arr - mean) / std

        # Substituir NaN por 0
        numeric_arr = np.nan_to_num(numeric_arr, nan=0.0)

        # 6. Targets
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
        """Extrai features numéricas do DataFrame."""
        numeric_cols = []

        # Demográficas
        if 'idade' in df.columns:
            numeric_cols.append('idade')
        if 'sexo' in df.columns:
            numeric_cols.append('sexo')
        if 'faixa_etaria' in df.columns:
            numeric_cols.append('faixa_etaria')
        if 'urgencia' in df.columns:
            numeric_cols.append('urgencia')

        # Contagem CIDs
        if 'n_cids_secundarios' in df.columns:
            numeric_cols.append('n_cids_secundarios')

        available = [c for c in numeric_cols if c in df.columns]
        result = df[available].copy() if available else pd.DataFrame(index=df.index)

        # Preencher NaN
        for col in result.columns:
            result[col] = pd.to_numeric(result[col], errors='coerce').fillna(0)

        return result

    def save(self, filepath: str):
        """Salva FeatureBuilder ajustado."""
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
        """Carrega FeatureBuilder salvo."""
        with open(filepath, 'rb') as f:
            state = pickle.load(f)
        self.cid_proc.vocab = state['cid_vocab']
        self.cid_proc.reverse_vocab = {v: k for k, v in self.cid_proc.vocab.items()}
        self.cid_proc._fitted = True
        self.sigtap_proc.vocab = state['sigtap_vocab']
        self.sigtap_proc.group_vocab = state['sigtap_group_vocab']
        self.sigtap_proc.reverse_vocab = {v: k for k, v in self.sigtap_proc.vocab.items()}
        self.sigtap_proc._fitted = True
        self._numeric_mean = state['numeric_mean']
        self._numeric_std = state['numeric_std']
        self._numeric_cols = state.get('numeric_cols', [])
        self.max_cids = state['max_cids']
        self._fitted = True
        logger.info(f"FeatureBuilder carregado de {filepath}")
