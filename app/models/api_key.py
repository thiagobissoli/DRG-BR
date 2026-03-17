"""
API keys (per user), usage log and quotas.
"""
from datetime import datetime
import hashlib
import secrets

from app.extensions import db


def _normalize_key(key: str) -> str:
    """Remove espaços e caracteres de controle que podem vir do header/body."""
    if not key:
        return ""
    s = str(key).strip().replace("\r", "").replace("\n", "").replace("\x00", "")
    return s


def hash_key(key: str) -> str:
    return hashlib.sha256(_normalize_key(key).encode("utf-8")).hexdigest()


class ApiKey(db.Model):
    __tablename__ = "api_keys"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    key_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)
    name = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_used_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship("User", back_populates="api_keys")
    usage_logs = db.relationship("ApiUsageLog", back_populates="api_key", lazy="dynamic")
    quotas = db.relationship("ApiQuota", back_populates="api_key", lazy="dynamic")

    @staticmethod
    def generate_for_user(user_id: int, name: str = None) -> str:
        plain = secrets.token_urlsafe(32)
        rec = ApiKey(user_id=user_id, key_hash=hash_key(plain), name=name or "")
        db.session.add(rec)
        db.session.commit()
        return plain

    @staticmethod
    def validate(plain_key: str) -> "ApiKey":
        normalized = _normalize_key(plain_key) if plain_key is not None else ""
        if not normalized:
            return None
        h = hash_key(normalized)
        key_obj = ApiKey.query.filter_by(key_hash=h).first()
        # Fallback: se no passado key_hash foi armazenado em texto plano (legado)
        if not key_obj and len(normalized) > 32 and " " not in normalized:
            # não aceitar 64 chars hex (seria o próprio hash) por segurança
            if len(normalized) != 64 or not all(c in "0123456789abcdef" for c in normalized.lower()):
                key_obj = ApiKey.query.filter_by(key_hash=normalized).first()
        return key_obj


class ApiUsageLog(db.Model):
    __tablename__ = "api_usage_log"
    id = db.Column(db.Integer, primary_key=True)
    api_key_id = db.Column(db.Integer, db.ForeignKey("api_keys.id", ondelete="CASCADE"), nullable=False, index=True)
    endpoint = db.Column(db.String(255), nullable=False)
    method = db.Column(db.String(16), nullable=True)
    requested_at = db.Column(db.DateTime, default=datetime.utcnow)
    status_code = db.Column(db.Integer, nullable=True)
    response_time_ms = db.Column(db.Integer, nullable=True)

    api_key = db.relationship("ApiKey", back_populates="usage_logs")


class ApiQuota(db.Model):
    __tablename__ = "api_quotas"
    id = db.Column(db.Integer, primary_key=True)
    api_key_id = db.Column(db.Integer, db.ForeignKey("api_keys.id", ondelete="CASCADE"), nullable=False, index=True)
    limit_type = db.Column(db.String(32), nullable=False, default="requests_per_day")
    limit_value = db.Column(db.Integer, nullable=False, default=1000)
    period_start = db.Column(db.Date, nullable=True)  # for daily: date of day

    api_key = db.relationship("ApiKey", back_populates="quotas")
