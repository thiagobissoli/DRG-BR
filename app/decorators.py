"""
Permission and API key decorators.
"""
from functools import wraps
from flask import jsonify
from flask_login import current_user
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

from app.extensions import db
from app.models.user import User


def require_permission(permission_name: str):
    """Require logged-in user with given permission (JWT or session)."""
    def decorator(f):
        @wraps(f)
        def inner(*args, **kwargs):
            try:
                verify_jwt_in_request(optional=True)
            except Exception:
                pass
            user = None
            try:
                jwt_identity = get_jwt_identity()
                if jwt_identity:
                    user = User.query.get(int(jwt_identity))
            except Exception:
                pass
            if not user and current_user.is_authenticated:
                user = current_user
            if not user or not user.active:
                return jsonify({"error": "Unauthorized"}), 401
            if not user.has_permission(permission_name):
                return jsonify({"error": "Forbidden", "message": "Missing permission"}), 403
            return f(*args, **kwargs)
        return inner
    return decorator


def require_login(f):
    """Require authenticated user (JWT required for API)."""
    @wraps(f)
    def inner(*args, **kwargs):
        try:
            verify_jwt_in_request(optional=True)
        except Exception:
            pass
        user = None
        try:
            jwt_identity = get_jwt_identity()
            if jwt_identity:
                user = User.query.get(int(jwt_identity))
        except Exception:
            pass
        if not user and current_user.is_authenticated:
            user = current_user
        if not user or not user.active:
            return jsonify({"error": "Unauthorized", "message": "Valid JWT or login required"}), 401
        return f(*args, **kwargs)
    return inner
