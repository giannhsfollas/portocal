"""Application configuration."""
import os

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-in-production")
SQLALCHEMY_DATABASE_URI = os.environ.get("SQLALCHEMY_DATABASE_URI", "sqlite:///calendar.db")
SQLALCHEMY_TRACK_MODIFICATIONS = False
