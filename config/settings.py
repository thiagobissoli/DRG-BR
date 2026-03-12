"""
Configurações centrais do DRG-BR.
"""
from types import SimpleNamespace

# Targets de regressão e classificação
REGRESSION_TARGETS = [
    'los_aritmetico',
    'los_geometrico',
    'custo_sus',
    'custo_suplementar',
    'los_uti_aritmetico',
    'los_uti_geometrico',
]
CLASSIFICATION_TARGETS = [
    'obito',
    'evento_adverso',
    'intervencao_uti',
]
ALL_TARGETS = REGRESSION_TARGETS + CLASSIFICATION_TARGETS


class ModelConfig(SimpleNamespace):
    """Hiperparâmetros do modelo neural (mutável para overrides via CLI)."""
    def __init__(self, **kwargs):
        defaults = {
            'cid_embedding_dim': 64,
            'sigtap_embedding_dim': 32,
            'mdc_embedding_dim': 16,
            'shared_hidden_dims': [512, 256, 128],
            'dropout_rate': 0.3,
            'regression_head_dims': [64, 32],
            'classification_head_dims': [64, 32],
            'batch_size': 512,
            'epochs': 60,
            'learning_rate': 1e-3,
            'weight_decay': 1e-5,
            'min_delta': 1e-4,
            'patience': 15,
            'use_huber_loss': False,
            'huber_delta': 1.0,
        }
        defaults.update(kwargs)
        super().__init__(**defaults)


# Instância global (main.py pode alterar .epochs e .batch_size)
MODEL_CFG = ModelConfig()

# Dados
DATA_CFG = SimpleNamespace(
    train_ratio=0.7,
    val_ratio=0.15,
    test_ratio=0.15,
)
