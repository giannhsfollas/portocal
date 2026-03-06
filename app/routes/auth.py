"""Authentication routes: login, logout."""
from flask import Blueprint, render_template, request, redirect, url_for, session
from werkzeug.security import check_password_hash

from app.models import User

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if session.get("user_id"):
        return redirect(url_for("main.index"))
    if request.method == "POST":
        username = (request.form.get("username") or "").strip()
        password = request.form.get("password") or ""
        user = User.query.filter_by(username=username).first()
        if not user or not check_password_hash(user.password_hash, password):
            return render_template("login.html", error="Invalid username or password")
        session["user_id"] = user.id
        return redirect(url_for("main.index"))
    return render_template("login.html")


@auth_bp.route("/logout", methods=["GET", "POST"])
def logout():
    session.pop("user_id", None)
    return redirect(url_for("auth.login"))
