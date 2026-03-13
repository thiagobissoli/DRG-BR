"""
Modelo neural multi-target DRG-BR (PyTorch).
"""
import torch
import torch.nn as nn
from typing import Dict, Optional
from config.settings import REGRESSION_TARGETS, CLASSIFICATION_TARGETS, MODEL_CFG


class DRGBRModel(nn.Module):
    def __init__(
        self,
        cid_vocab_size: int,
        sigtap_vocab_size: int,
        n_numeric_features: int,
        n_mdc: int = 26,
        config=None,
    ):
        super().__init__()
        cfg = config or MODEL_CFG
        self.cid_emb = nn.Embedding(cid_vocab_size, cfg.cid_embedding_dim, padding_idx=0)
        self.sigtap_emb = nn.Embedding(sigtap_vocab_size, cfg.sigtap_embedding_dim, padding_idx=0)
        self.mdc_emb = nn.Embedding(n_mdc + 1, cfg.mdc_embedding_dim, padding_idx=0)
        emb_dim = cfg.cid_embedding_dim + cfg.cid_embedding_dim + cfg.sigtap_embedding_dim + cfg.mdc_embedding_dim + n_numeric_features
        layers = []
        prev = emb_dim
        for h in cfg.shared_hidden_dims:
            layers.extend([
                nn.Linear(prev, h),
                nn.ReLU(),
                nn.Dropout(cfg.dropout_rate),
            ])
            prev = h
        self.trunk = nn.Sequential(*layers)
        self.shared_out_dim = prev
        self.reg_heads = nn.ModuleDict({
            t: nn.Sequential(
                nn.Linear(prev, cfg.regression_head_dims[0]),
                nn.ReLU(),
                nn.Dropout(cfg.dropout_rate),
                nn.Linear(cfg.regression_head_dims[0], cfg.regression_head_dims[1]),
                nn.ReLU(),
                nn.Linear(cfg.regression_head_dims[1], 1),
            ) for t in REGRESSION_TARGETS
        })
        self.cls_heads = nn.ModuleDict({
            t: nn.Sequential(
                nn.Linear(prev, cfg.classification_head_dims[0]),
                nn.ReLU(),
                nn.Dropout(cfg.dropout_rate),
                nn.Linear(cfg.classification_head_dims[0], 1),
                nn.Sigmoid(),
            ) for t in CLASSIFICATION_TARGETS
        })

    def forward(
        self,
        cid_principal: torch.Tensor,
        cids_secundarios: torch.Tensor,
        procedimento: torch.Tensor,
        mdc: torch.Tensor,
        numeric: torch.Tensor,
    ) -> Dict[str, torch.Tensor]:
        cfg = MODEL_CFG
        cid_emb = self.cid_emb(cid_principal)
        cid_sec_emb = self.cid_emb(cids_secundarios).mean(dim=1)
        proc_emb = self.sigtap_emb(procedimento)
        mdc_emb = self.mdc_emb(mdc.clamp(0, 26))
        x = torch.cat([cid_emb, cid_sec_emb, proc_emb, mdc_emb, numeric], dim=1)
        x = self.trunk(x)
        out = {}
        for t in REGRESSION_TARGETS:
            out[t] = self.reg_heads[t](x).squeeze(-1)
        for t in CLASSIFICATION_TARGETS:
            out[t] = self.cls_heads[t](x).squeeze(-1)
        return out

    def count_parameters(self) -> int:
        return sum(p.numel() for p in self.parameters() if p.requires_grad)
