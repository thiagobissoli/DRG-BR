"""
Tabelas de referência DRG: MDC, CC/MCC (Apêndices C e H MS-DRG).
"""
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# MDC 01-26 (títulos resumidos em PT)
MDC_TITLES = {
    '01': 'Sistema Nervoso',
    '02': 'Olho',
    '03': 'Orelha, Nariz, Boca e Garganta',
    '04': 'Sistema Respiratório',
    '05': 'Aparelho Circulatório',
    '06': 'Aparelho Digestivo',
    '07': 'Sistema Musculoesquelético',
    '08': 'Pele, TEC, Mama',
    '09': 'Endócrino, Nutrição, Metabólico',
    '10': 'Rim e Trato Urinário',
    '11': 'Reprodutor Masculino',
    '12': 'Reprodutor Feminino',
    '13': 'Gestação e Parto',
    '14': 'Neonato',
    '15': 'Sangue, Órgãos Hemat e Imunol',
    '16': 'Neoplasias',
    '17': 'Doenças Infecciosas',
    '18': 'Transtornos Mentais',
    '19': 'Abuso de Substâncias',
    '20': 'Traumatismos, Envenenamentos',
    '21': 'Queimaduras',
    '22': 'Fatores que Influenciam Estado de Saúde',
    '23': 'Múltiplos Traumatismos',
    '24': 'HIV',
    '25': 'Transplante',
    '26': 'Procedimentos em Pacientes com Afecções Sistêmicas',
    '99': 'Outros / Não mapeado',
}


def get_mdc_from_cid(cid: str) -> str:
    """
    Mapeia CID-10 (código ou prefixo) para MDC.
    Simplificado: usa primeira letra/categoria para MDC genérico.
    """
    if not cid or not isinstance(cid, str):
        return '99'
    cid = cid.upper().strip().replace('.', '')
    if not cid:
        return '99'
    letter = cid[0]
    # Mapeamento letra CID -> MDC (aproximado)
    letter_to_mdc = {
        'A': '17', 'B': '17', 'C': '16', 'D': '16', 'E': '09', 'F': '18',
        'G': '01', 'H': '02', 'I': '05', 'J': '04', 'K': '06', 'L': '08',
        'M': '07', 'N': '10', 'O': '13', 'P': '14', 'Q': '07', 'R': '22',
        'S': '20', 'T': '20', 'U': '17', 'V': '20', 'W': '20', 'X': '20',
        'Y': '20', 'Z': '22',
    }
    return letter_to_mdc.get(letter, '99')


class CCCMCCClassifier:
    """Classificador CC/MCC baseado em listas de códigos (Apêndices C e H)."""

    def __init__(self):
        self.mcc_codes: Dict[str, set] = {}   # mdc -> set(cid)
        self.cc_codes: Dict[str, set] = {}
        self._fitted = False

    def fit(self, mcc_by_mdc: Optional[Dict[str, List[str]]] = None,
            cc_by_mdc: Optional[Dict[str, List[str]]] = None):
        if mcc_by_mdc is None:
            mcc_by_mdc = {}
        if cc_by_mdc is None:
            cc_by_mdc = {}
        self.mcc_codes = {mdc: set(codes) for mdc, codes in mcc_by_mdc.items()}
        self.cc_codes = {mdc: set(codes) for mdc, codes in cc_by_mdc.items()}
        self._fitted = True
        return self

    def classify(self, cid_principal: str, cids_secundarios: List[str]) -> Tuple[int, dict]:
        """
        Retorna severity: 0=sem CC, 1=CC, 2=MCC.
        E dict com has_cc, has_mcc, total_complications.
        """
        mdc = get_mdc_from_cid(cid_principal)
        all_cids = [cid_principal.upper().replace('.', '')] + [
            c.upper().replace('.', '') for c in (cids_secundarios or [])
        ]
        has_mcc = False
        has_cc = False
        for cid in all_cids:
            for mdc_key, codes in self.mcc_codes.items():
                if mdc_key == mdc or mdc_key == '*':
                    if cid in codes or any(cid.startswith(c) for c in codes if len(c) <= len(cid)):
                        has_mcc = True
                        break
            for mdc_key, codes in self.cc_codes.items():
                if mdc_key == mdc or mdc_key == '*':
                    if cid in codes or any(cid.startswith(c) for c in codes if len(c) <= len(cid)):
                        has_cc = True
                        break
        severity = 2 if has_mcc else (1 if has_cc else 0)
        total = sum(1 for c in all_cids if self._is_complication(c, mdc))
        return severity, {
            'has_cc': has_cc,
            'has_mcc': has_mcc,
            'total_complications': total,
        }

    def _is_complication(self, cid: str, mdc: str) -> bool:
        for codes in (self.mcc_codes.get(mdc, set()), self.cc_codes.get(mdc, set()),
                      self.mcc_codes.get('*', set()), self.cc_codes.get('*', set())):
            if cid in codes:
                return True
        return False

    def save_to_json(self, filepath: str):
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            'mcc': {mdc: list(codes) for mdc, codes in self.mcc_codes.items()},
            'cc': {mdc: list(codes) for mdc, codes in self.cc_codes.items()},
        }
        with open(path, 'w') as f:
            json.dump(data, f, indent=2)
        logger.info(f"CC/MCC salvo em {filepath}")

    def load_from_json(self, filepath: str):
        with open(filepath, 'r') as f:
            data = json.load(f)
        self.mcc_codes = {mdc: set(codes) for mdc, codes in data.get('mcc', {}).items()}
        self.cc_codes = {mdc: set(codes) for mdc, codes in data.get('cc', {}).items()}
        self._fitted = True
        logger.info(f"CC/MCC carregado de {filepath}")


# Instância global (usada pelo processor, predictor, feature_builder)
cc_mcc_classifier = CCCMCCClassifier()

# Inicializar com listas vazias para não quebrar se não houver dados
cc_mcc_classifier.fit()
