"""Register all blueprints on the Flask app."""
from app.routes.auth import auth_bp
from app.routes.main import main_bp
from app.routes.api import api_bp


def register_blueprints(application):
    application.register_blueprint(auth_bp)
    application.register_blueprint(main_bp)
    application.register_blueprint(api_bp)
