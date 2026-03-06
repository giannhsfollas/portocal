"""Auth decorators."""
from functools import wraps
from flask import session, jsonify


def require_user(f):
    """Decorator: return 401 if no user in session."""
    @wraps(f)
    def wrapped(*args, **kwargs):
        if session.get("user_id") is None:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return wrapped
