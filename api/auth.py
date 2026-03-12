"""
Sistema de geração e validação de chaves de API.
Chaves armazenadas em SQLite (hash SHA-256); a chave em texto puro é exibida apenas na criação.
"""
import hashlib
import secrets
import sqlite3
from pathlib import Path
from typing import List, Optional, Tuple

# Diretório padrão: data/ na raiz do projeto
ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = ROOT / "data" / "api_keys.db"


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


class APIKeyStore:
    """Armazena e valida chaves de API em SQLite."""

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = Path(db_path or DEFAULT_DB_PATH)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _get_conn(self) -> sqlite3.Connection:
        return sqlite3.connect(str(self.db_path))

    def _init_schema(self) -> None:
        with self._get_conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS api_keys (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key_hash TEXT NOT NULL UNIQUE,
                    name TEXT,
                    created_at TEXT DEFAULT (datetime('now'))
                )
            """)
            conn.commit()

    def generate(self, name: Optional[str] = None) -> str:
        """
        Gera uma nova chave de API. A chave em texto puro é retornada uma única vez.
        """
        key = secrets.token_urlsafe(32)
        key_hash = _hash_key(key)
        with self._get_conn() as conn:
            conn.execute(
                "INSERT INTO api_keys (key_hash, name) VALUES (?, ?)",
                (key_hash, name or ""),
            )
            conn.commit()
        return key

    def validate(self, key: str) -> bool:
        """Retorna True se a chave existir e for válida."""
        if not key or not key.strip():
            return False
        key_hash = _hash_key(key.strip())
        with self._get_conn() as conn:
            cur = conn.execute(
                "SELECT 1 FROM api_keys WHERE key_hash = ? LIMIT 1",
                (key_hash,),
            )
            return cur.fetchone() is not None

    def revoke(self, key: str) -> bool:
        """Remove a chave. Retorna True se foi removida."""
        key_hash = _hash_key(key.strip())
        with self._get_conn() as conn:
            cur = conn.execute("DELETE FROM api_keys WHERE key_hash = ?", (key_hash,))
            conn.commit()
            return cur.rowcount > 0

    def list_keys(self) -> List[Tuple[int, Optional[str], str]]:
        """Lista (id, name, created_at) das chaves (sem expor o hash)."""
        with self._get_conn() as conn:
            cur = conn.execute(
                "SELECT id, name, created_at FROM api_keys ORDER BY id"
            )
            return cur.fetchall()
