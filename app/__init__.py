"""Portocal – per-user school calendar application."""
import os

from flask import Flask
from flask_sqlalchemy import SQLAlchemy

from app.config import (
    SECRET_KEY,
    SQLALCHEMY_DATABASE_URI,
    SQLALCHEMY_TRACK_MODIFICATIONS,
)

# Project root (parent of app package) so templates/ and static/ are found
_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

application = Flask(
    __name__,
    template_folder=os.path.join(_root, "templates"),
    static_folder=os.path.join(_root, "static"),
)
application.config["SECRET_KEY"] = SECRET_KEY
application.config["SQLALCHEMY_DATABASE_URI"] = SQLALCHEMY_DATABASE_URI
application.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = SQLALCHEMY_TRACK_MODIFICATIONS

db = SQLAlchemy(application)

import app.models  # noqa: E402 – register models with db

from app.routes import register_blueprints  # noqa: E402

register_blueprints(application)

app = application

__all__ = ["app", "db"]
