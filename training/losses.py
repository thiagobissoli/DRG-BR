"""
Loss multi-task com uncertainty weighting (Kendall et al.).
"""
import torch
import torch.nn as nn
from typing import Dict
from config.settings import REGRESSION_TARGETS, CLASSIFICATION_TARGETS, MODEL_CFG


class MultiTaskLoss(nn.Module):
    def __init__(self, use_uncertainty: bool = True, config=None):
        super().__init__()
        self.use_uncertainty = use_uncertainty
        self.cfg = config or MODEL_CFG
        self.log_vars = nn.Parameter(torch.zeros(len(REGRESSION_TARGETS) + len(CLASSIFICATION_TARGETS)))

    def forward(
        self,
        preds: Dict[str, torch.Tensor],
        targets_reg: torch.Tensor,
        targets_cls: torch.Tensor,
    ) -> Dict[str, torch.Tensor]:
        losses = {}
        total = 0.0
        for i, t in enumerate(REGRESSION_TARGETS):
            if preds.get(t) is None or targets_reg is None or i >= targets_reg.shape[1]:
                continue
            diff = preds[t] - targets_reg[:, i]
            if getattr(self.cfg, 'use_huber_loss', False):
                reg_loss = nn.functional.smooth_l1_loss(preds[t], targets_reg[:, i], reduction='mean', beta=getattr(self.cfg, 'huber_delta', 1.0))
            else:
                reg_loss = (diff ** 2).mean()
            if self.use_uncertainty:
                log_var = self.log_vars[i]
                losses[t] = 0.5 * (torch.exp(-log_var) * reg_loss + log_var)
            else:
                losses[t] = reg_loss
            total = total + losses[t]
        for i, t in enumerate(CLASSIFICATION_TARGETS):
            if preds.get(t) is None or targets_cls is None or i >= targets_cls.shape[1]:
                continue
            bce = nn.functional.binary_cross_entropy(preds[t], targets_cls[:, i].clamp(0, 1), reduction='mean')
            j = len(REGRESSION_TARGETS) + i
            if self.use_uncertainty:
                log_var = self.log_vars[j]
                losses[t] = 0.5 * (torch.exp(-log_var) * bce + log_var)
            else:
                losses[t] = bce
            total = total + losses[t]
        losses['total'] = total
        return losses
