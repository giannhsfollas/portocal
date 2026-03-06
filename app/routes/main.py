"""Main page route: calendar index."""
from flask import Blueprint, render_template, redirect, url_for, session

from app.models import User

main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def index():
    if session.get("user_id") is None:
        return redirect(url_for("auth.login"))
    user = User.query.get(session["user_id"])
    return render_template("index.html", username=user.username if user else None)
