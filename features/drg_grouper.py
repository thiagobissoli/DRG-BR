"""
DRG Grouper: atribui MDC, tipo (cirúrgico/clínico), severidade CC/MCC.
"""
from typing import Dict, List
from config.drg_tables import get_mdc_from_cid, cc_mcc_classifier, MDC_TITLES


class DRGGrouper:
    def assign_drg(
        self,
        cid_principal: str,
        cids_secundarios: List[str],
        procedimento_sigtap: str,
    ) -> Dict:
        """
        Retorna drg_br_code, mdc, mdc_title, is_surgical, severity, cc_mcc_info.
        """
        cid = (cid_principal or "").upper().replace(".", "")
        sec = [c.upper().replace(".", "") for c in (cids_secundarios or [])]
        mdc = get_mdc_from_cid(cid)
        severity, cc_mcc_info = cc_mcc_classifier.classify(cid_principal, cids_secundarios or [])
        is_surgical = self._is_surgical(procedimento_sigtap)
        tipo = "S" if is_surgical else "M"
        drg_br_code = f"{mdc}-{tipo}-{severity}"
        return {
            'drg_br_code': drg_br_code,
            'mdc': mdc,
            'mdc_title': MDC_TITLES.get(mdc, 'Outros'),
            'is_surgical': is_surgical,
            'severity': severity,
            'cc_mcc_info': cc_mcc_info,
        }

    def _is_surgical(self, procedimento: str) -> bool:
        """Procedimentos que começam com certos grupos são cirúrgicos."""
        p = (procedimento or "").strip()
        if not p or len(p) < 2:
            return False
        grp = p[:2]
        surgical_groups = {'03', '04', '05', '06', '07', '08', '09'}
        return grp in surgical_groups

    def get_numeric_features(
        self,
        cid_principal: str,
        cids_secundarios: List[str],
        procedimento: str,
    ) -> Dict:
        """Retorna mdc_code (int) e flags numéricas para o modelo."""
        info = self.assign_drg(cid_principal, cids_secundarios, procedimento)
        mdc = info['mdc']
        mdc_code = int(mdc) if mdc.isdigit() else 99
        return {
            'mdc_code': min(25, max(0, mdc_code)),
            'is_surgical': 1.0 if info['is_surgical'] else 0.0,
            'severity': float(info['severity']),
            'n_cc_mcc': float(info['cc_mcc_info']['total_complications']),
        }
