"""
DRG-BR: Preditor para inferência em produção.

Recebe CID-10 + Procedimento SIGTAP e retorna todas as predições.
"""
import numpy as np
import torch
import pickle
from typing import Dict, List, Optional
from pathlib import Path
import logging

from config.settings import MODEL_CFG, REGRESSION_TARGETS, CLASSIFICATION_TARGETS
from config.drg_tables import MDC_TITLES
from features.feature_builder import FeatureBuilder, FeatureSet
from features.drg_grouper import DRGGrouper
from models.multi_target_model import DRGBRModel
from models.gradient_boost import GBMMultiTarget
from models.ensemble import DRGEnsemble

logger = logging.getLogger(__name__)


class DRGPredictor:
    """
    Preditor DRG-BR para uso em produção.

    Uso:
        predictor = DRGPredictor.load("models/")
        result = predictor.predict(
            cid_principal="I21.0",
            cids_secundarios=["I10", "E11.9"],
            procedimento_sigtap="0406020043"
        )
    """

    def __init__(self):
        self.feature_builder: Optional[FeatureBuilder] = None
        self.neural_model: Optional[DRGBRModel] = None
        self.gbm_model: Optional[GBMMultiTarget] = None
        self.ensemble: Optional[DRGEnsemble] = None
        self.drg_grouper = DRGGrouper()
        self.device = torch.device("cpu")
        self._loaded = False

    @classmethod
    def load(cls, model_dir: str, device: str = "cpu") -> 'DRGPredictor':
        """
        Carrega predictor completo a partir do diretório de modelos.

        Arquivos esperados:
        - model_metadata.json     → metadados de arquitetura (obrigatório)
        - feature_builder.pkl     → vocabulários e normalização (obrigatório)
        - neural_model.pt         → pesos do modelo neural (opcional)
        - gbm_model.pkl           → modelos GBM (opcional)
        - ensemble_weights.pkl    → pesos do ensemble (opcional)
        - cc_mcc.json             → classificador CC/MCC (opcional)
        """
        predictor = cls()
        path = Path(model_dir)
        predictor.device = torch.device(device)

        if not path.exists():
            raise FileNotFoundError(f"Diretório de modelos não encontrado: {path}")

        # 1. Metadados de arquitetura
        metadata_path = path / "model_metadata.json"
        metadata = {}
        if metadata_path.exists():
            import json
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            logger.info(f"Metadados carregados: neural={metadata.get('has_neural')}, "
                        f"gbm={metadata.get('has_gbm')}, ensemble={metadata.get('has_ensemble')}")

        # 2. Feature builder (obrigatório)
        fb_path = path / "feature_builder.pkl"
        if fb_path.exists():
            predictor.feature_builder = FeatureBuilder()
            predictor.feature_builder.load(str(fb_path))
            logger.info(f"FeatureBuilder carregado: CID vocab={predictor.feature_builder.cid_proc.vocab_size}, "
                        f"SIGTAP vocab={predictor.feature_builder.sigtap_proc.vocab_size}")
        else:
            raise FileNotFoundError(f"feature_builder.pkl não encontrado em {path}. "
                                     "Este arquivo é obrigatório para inferência.")

        # 3. Modelo neural
        nn_path = path / "neural_model.pt"
        if nn_path.exists():
            cid_vocab = metadata.get('cid_vocab_size', predictor.feature_builder.cid_proc.vocab_size)
            sigtap_vocab = metadata.get('sigtap_vocab_size', predictor.feature_builder.sigtap_proc.vocab_size)
            n_numeric = metadata.get('n_numeric_features', len(predictor.feature_builder._numeric_cols) + 7)
            n_mdc = metadata.get('n_mdc', 26)

            # Reconstruir config se disponível
            model_config = None
            if 'config' in metadata:
                from config.settings import ModelConfig
                cfg_data = metadata['config']
                model_config = ModelConfig(
                    cid_embedding_dim=cfg_data.get('cid_embedding_dim', 64),
                    sigtap_embedding_dim=cfg_data.get('sigtap_embedding_dim', 32),
                    mdc_embedding_dim=cfg_data.get('mdc_embedding_dim', 16),
                    shared_hidden_dims=cfg_data.get('shared_hidden_dims', [512, 256, 128]),
                    dropout_rate=cfg_data.get('dropout_rate', 0.3),
                    regression_head_dims=cfg_data.get('regression_head_dims', [64, 32]),
                    classification_head_dims=cfg_data.get('classification_head_dims', [64, 32]),
                )

            predictor.neural_model = DRGBRModel(
                cid_vocab_size=cid_vocab,
                sigtap_vocab_size=sigtap_vocab,
                n_mdc=n_mdc,
                n_numeric_features=n_numeric,
                config=model_config,
            )
            predictor.neural_model.load_state_dict(
                torch.load(nn_path, map_location=device, weights_only=True)
            )
            predictor.neural_model.to(predictor.device)
            predictor.neural_model.eval()
            logger.info(f"Modelo neural carregado: {predictor.neural_model.count_parameters():,} parâmetros")

        # 4. GBM
        gbm_path = path / "gbm_model.pkl"
        if gbm_path.exists():
            predictor.gbm_model = GBMMultiTarget()
            predictor.gbm_model.load(str(gbm_path))
            logger.info(f"GBM carregado: {len(predictor.gbm_model.models)} modelos")

        # 5. Ensemble weights
        ens_path = path / "ensemble_weights.pkl"
        if ens_path.exists():
            predictor.ensemble = DRGEnsemble()
            with open(ens_path, 'rb') as f:
                predictor.ensemble.weights = pickle.load(f)
            predictor.ensemble._fitted = True
            logger.info(f"Ensemble carregado: {len(predictor.ensemble.weights)} targets")

        # 6. CC/MCC (carregar no classificador global se disponível)
        cc_path = path / "cc_mcc.json"
        if cc_path.exists():
            from config.drg_tables import cc_mcc_classifier
            cc_mcc_classifier.load_from_json(str(cc_path))
            logger.info(f"CC/MCC carregado do diretório de modelos")

        # Validar que pelo menos um modelo foi carregado
        if not predictor.neural_model and not predictor.gbm_model:
            raise RuntimeError(f"Nenhum modelo encontrado em {path}. "
                               "Esperado neural_model.pt e/ou gbm_model.pkl")

        predictor._loaded = True
        logger.info(f"Predictor pronto para inferência (dir={path})")
        return predictor

    def predict(
        self,
        cid_principal: str,
        cids_secundarios: Optional[List[str]] = None,
        procedimento_sigtap: str = "",
        idade: int = 50,
        sexo: int = 0,
        urgencia: int = 1,
    ) -> Dict:
        """
        Predição completa para uma internação.

        Args:
            cid_principal: CID-10 principal (ex: "I21.0")
            cids_secundarios: Lista de CIDs secundários (ex: ["I10", "E11.9"])
            procedimento_sigtap: Código SIGTAP (ex: "0406020043")
            idade: Idade do paciente
            sexo: 0=Masculino, 1=Feminino
            urgencia: 1=Urgência, 0=Eletivo

        Returns:
            Dict com todas as predições e informações DRG
        """
        if cids_secundarios is None:
            cids_secundarios = []

        # DRG Grouping
        drg_info = self.drg_grouper.assign_drg(
            cid_principal, cids_secundarios, procedimento_sigtap
        )

        # Construir DataFrame minimal para feature builder
        import pandas as pd
        df = pd.DataFrame([{
            'cid_principal': cid_principal.upper().replace('.', ''),
            'cids_secundarios': [c.upper().replace('.', '') for c in cids_secundarios],
            'n_cids_secundarios': len(cids_secundarios),
            'procedimento': str(procedimento_sigtap).strip(),
            'idade': idade,
            'sexo': sexo,
            'urgencia': urgencia,
            'faixa_etaria': min(8, max(0, idade // 15)),
        }])

        # Transform
        feature_set = self.feature_builder.transform(df, include_targets=False)

        # Predict
        predictions = self._run_prediction(feature_set)

        # Montar resultado
        result = {
            'drg_br_code': drg_info['drg_br_code'],
            'mdc': drg_info['mdc'],
            'mdc_title': drg_info['mdc_title'],
            'is_surgical': drg_info['is_surgical'],
            'severity': drg_info['severity'],
            'cc_mcc_summary': {
                'has_cc': drg_info['cc_mcc_info']['has_cc'],
                'has_mcc': drg_info['cc_mcc_info']['has_mcc'],
                'n_complications': drg_info['cc_mcc_info']['total_complications'],
            },
        }

        # Adicionar predições
        for target in REGRESSION_TARGETS:
            if target in predictions:
                val = float(predictions[target][0])
                # Converter log-LOS geométrico para valor real
                if 'geometrico' in target:
                    val = np.expm1(val) if val < 10 else val
                result[target] = round(val, 2)

        for target in CLASSIFICATION_TARGETS:
            if target in predictions:
                prob = float(predictions[target][0])
                result[f'prob_{target}'] = round(prob, 4)

        return result

    def predict_batch(
        self,
        records: List[Dict],
    ) -> List[Dict]:
        """Predição em lote."""
        return [self.predict(**r) for r in records]

    def _run_prediction(self, feature_set: FeatureSet) -> Dict[str, np.ndarray]:
        """Executa predição com os modelos disponíveis."""
        all_preds = {}

        # Neural
        if self.neural_model:
            self.neural_model.eval()
            with torch.no_grad():
                cid_p = torch.LongTensor(feature_set.cid_principal_idx).to(self.device)
                cids_s = torch.LongTensor(feature_set.cids_secundarios_idx).to(self.device)
                proc = torch.LongTensor(feature_set.procedimento_idx).to(self.device)
                mdc = torch.LongTensor(feature_set.mdc_idx).to(self.device)
                numeric = torch.FloatTensor(feature_set.numeric_features).to(self.device)

                preds = self.neural_model(cid_p, cids_s, proc, mdc, numeric)
                all_preds['neural'] = {t: v.cpu().numpy() for t, v in preds.items()}

        # GBM
        if self.gbm_model:
            all_preds['gbm'] = self.gbm_model.predict(feature_set)

        # Ensemble ou single model
        if self.ensemble and len(all_preds) > 1:
            return self.ensemble.predict(all_preds)
        elif 'neural' in all_preds:
            return all_preds['neural']
        elif 'gbm' in all_preds:
            return all_preds['gbm']
        else:
            raise RuntimeError("Nenhum modelo carregado para predição.")
