"""
Processador de dados a partir do SQLite para DataFrame de treino.
"""
import json
import logging
import sqlite3
from pathlib import Path
from typing import Optional, List, Any

import pandas as pd

from config.drg_tables import cc_mcc_classifier, get_mdc_from_cid

logger = logging.getLogger(__name__)


class SQLiteDataProcessor:
    """Extrai dados do SQLite e prepara DataFrame com targets para treino."""

    def __init__(self, db):
        self.db = db

    def load_cc_mcc_into_classifier(self):
        """Carrega tabela cc_mcc do banco no cc_mcc_classifier global."""
        conn = self.db._get_conn()
        try:
            cur = conn.execute(
                "SELECT mdc, tipo, codigo FROM cc_mcc"
            )
            rows = cur.fetchall()
        except sqlite3.OperationalError:
            rows = []
        mcc = {}
        cc = {}
        for mdc, tipo, codigo in rows:
            codigo = (codigo or "").upper().replace(".", "")
            if tipo == "MCC":
                mcc.setdefault(mdc, []).append(codigo)
            else:
                cc.setdefault(mdc, []).append(codigo)
        cc_mcc_classifier.fit(mcc_by_mdc=mcc, cc_by_mdc=cc)
        logger.info(f"CC/MCC carregado: {len(rows)} códigos")

    def prepare_training_data(
        self,
        uf: Optional[str] = None,
        anos: Optional[List[int]] = None,
        limit: Optional[int] = None,
    ) -> pd.DataFrame:
        """
        Lê sih_internacoes (e JOINs se houver), aplica CC/MCC e retorna DataFrame
        com colunas esperadas pelo FeatureBuilder e targets.
        """
        self.db.init_schema()
        conn = self.db._get_conn()
        # Códigos IBGE do estado (DATASUS/PySUS grava UF como número, ex.: 32 = ES)
        UF_TO_IBGE = {
            'AC': '12', 'AL': '27', 'AP': '16', 'AM': '13', 'BA': '29', 'CE': '23',
            'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21', 'MT': '51', 'MS': '50',
            'MG': '31', 'PA': '15', 'PB': '25', 'PR': '41', 'PE': '26', 'PI': '22',
            'RJ': '33', 'RN': '24', 'RS': '43', 'RO': '11', 'RR': '14', 'SC': '42',
            'SP': '35', 'SE': '28', 'TO': '17',
        }
        query = """
            SELECT
                COALESCE(TRIM(cid_principal), '') AS cid_principal,
                COALESCE(cids_secundarios, '[]') AS cids_secundarios,
                procedimento AS procedimento,
                COALESCE(idade, 50) AS idade,
                COALESCE(sexo, 0) AS sexo,
                COALESCE(urgencia, 1) AS urgencia,
                COALESCE(dias_internacao, 0) AS dias_internacao,
                COALESCE(dias_uti, 0) AS dias_uti,
                COALESCE(obito, 0) AS obito,
                COALESCE(valor_sus, 0) AS valor_sus,
                COALESCE(valor_suplementar, 0) AS valor_suplementar,
                COALESCE(evento_adverso, 0) AS evento_adverso,
                COALESCE(intervencao_uti, 0) AS intervencao_uti
            FROM sih_internacoes
            WHERE TRIM(COALESCE(cid_principal, '')) != ''
        """
        params = []
        if uf:
            uf_upper = str(uf).upper().strip()[:2]
            ibge = UF_TO_IBGE.get(uf_upper)
            if ibge:
                query += " AND (uf = ? OR uf = ?)"
                params.extend([uf_upper, ibge])
            else:
                query += " AND uf = ?"
                params.append(uf_upper)
        if anos:
            placeholders = ",".join("?" * len(anos))
            query += f" AND ano IN ({placeholders})"
            params.extend(anos)
        query += " ORDER BY id"
        if limit:
            query += f" LIMIT {int(limit)}"
        df = pd.read_sql_query(query, conn, params=params if params else None)
        if len(df) == 0:
            logger.warning("Nenhum registro de internação no banco. Retornando DataFrame vazio.")
            return self._empty_dataframe()

        df['cid_principal'] = df['cid_principal'].astype(str).str.upper().str.replace('.', '')
        df['procedimento'] = df['procedimento'].astype(str).str.strip()
        # Parse cids_secundarios do banco (JSON array ou texto separado por vírgula/pipe)
        def _parse_cids_sec(raw: Any) -> List[str]:
            if raw is None or (isinstance(raw, str) and not raw.strip()):
                return []
            s = str(raw).strip()
            if not s or s.upper() in ('NAN', 'NULL', '[]'):
                return []
            if s.startswith('['):
                try:
                    lst = json.loads(s)
                    return [str(c).upper().replace('.', '').strip()[:7] for c in lst if c and str(c).strip()]
                except (json.JSONDecodeError, TypeError):
                    pass
            # Fallback: separado por vírgula ou pipe
            parts = s.replace('|', ',').split(',')
            return [str(p).upper().replace('.', '').strip()[:7] for p in parts if p and str(p).strip()]
        df['cids_secundarios'] = df['cids_secundarios'].apply(_parse_cids_sec)
        df['n_cids_secundarios'] = df['cids_secundarios'].apply(len)
        df['faixa_etaria'] = (df['idade'] // 15).clip(0, 8)

        # LOS geométrico: log1p(dias)
        df['los_geometrico'] = df['dias_internacao'].apply(lambda x: max(0, x))
        df['los_geometrico'] = df['los_geometrico'].replace(0, 0.5)
        import numpy as np
        df['los_geometrico'] = np.log1p(df['los_geometrico'])
        df['los_aritmetico'] = df['dias_internacao'].astype(float)
        df['los_uti_aritmetico'] = df['dias_uti'].astype(float)
        df['los_uti_geometrico'] = np.log1p(df['dias_uti'].clip(0))
        df['custo_sus'] = df['valor_sus'].astype(float)
        df['custo_suplementar'] = df['valor_suplementar'].astype(float)

        df = df.rename(columns={'obito': 'obito', 'evento_adverso': 'evento_adverso', 'intervencao_uti': 'intervencao_uti'})
        logger.info(f"DataFrame de treino: {len(df):,} linhas")
        return df.reset_index(drop=True)

    def _empty_dataframe(self) -> pd.DataFrame:
        return pd.DataFrame(columns=[
            'cid_principal', 'cids_secundarios', 'n_cids_secundarios', 'procedimento',
            'idade', 'sexo', 'urgencia', 'faixa_etaria',
            'los_aritmetico', 'los_geometrico', 'custo_sus', 'custo_suplementar',
            'los_uti_aritmetico', 'los_uti_geometrico',
            'obito', 'evento_adverso', 'intervencao_uti',
        ])
