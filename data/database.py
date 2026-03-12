"""
Gerenciador do banco SQLite DRG-BR.
"""
import sqlite3
import logging
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class DRGDatabase:
    """
    Banco SQLite com tabelas: cid10, sigtap, msdrg, mdc, cc_mcc, sih_internacoes, download_log.
    """

    def __init__(self, db_path: str = "data/drg_br.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn: Optional[sqlite3.Connection] = None

    def _get_conn(self) -> sqlite3.Connection:
        if self._conn is None:
            self._conn = sqlite3.connect(str(self.db_path))
            self._conn.execute("PRAGMA journal_mode=WAL")
            self._conn.execute("PRAGMA cache_size=-64000")
        return self._conn

    def init_schema(self):
        """Cria tabelas se não existirem."""
        conn = self._get_conn()
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS cid10 (
                codigo TEXT PRIMARY KEY,
                descricao TEXT
            );
            CREATE TABLE IF NOT EXISTS sigtap (
                codigo TEXT PRIMARY KEY,
                descricao TEXT,
                grupo TEXT
            );
            CREATE TABLE IF NOT EXISTS cc_mcc (
                mdc TEXT,
                tipo TEXT,
                codigo TEXT,
                PRIMARY KEY (mdc, tipo, codigo)
            );
            CREATE TABLE IF NOT EXISTS sih_internacoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                uf TEXT,
                ano INTEGER,
                mes INTEGER,
                cid_principal TEXT,
                cids_secundarios TEXT,
                procedimento TEXT,
                idade INTEGER,
                sexo INTEGER,
                urgencia INTEGER,
                dias_internacao INTEGER,
                dias_uti INTEGER,
                obito INTEGER,
                valor_sus REAL,
                valor_suplementar REAL,
                evento_adverso INTEGER,
                intervencao_uti INTEGER
            );
            CREATE TABLE IF NOT EXISTS download_log (
                fonte TEXT,
                uf TEXT,
                ano INTEGER,
                mes INTEGER,
                registros INTEGER,
                dt_download TEXT
            );
        """)
        conn.commit()
        logger.info("Schema SQLite inicializado")

    def get_stats(self) -> Dict[str, Any]:
        """Retorna contagem de registros por tabela."""
        self.init_schema()
        conn = self._get_conn()
        tables = ['cid10', 'sigtap', 'cc_mcc', 'sih_internacoes']
        stats = {}
        for t in tables:
            try:
                cur = conn.execute(f"SELECT COUNT(*) FROM {t}")
                stats[t] = cur.fetchone()[0]
            except sqlite3.OperationalError:
                stats[t] = 0
        try:
            cur = conn.execute(
                "SELECT fonte, COUNT(*), SUM(registros) FROM download_log GROUP BY fonte"
            )
            stats['downloads'] = {
                row[0]: {'count': row[1], 'records': row[2] or 0}
                for row in cur.fetchall()
            }
        except Exception:
            stats['downloads'] = {}
        return stats

    def close(self):
        if self._conn:
            self._conn.close()
            self._conn = None
