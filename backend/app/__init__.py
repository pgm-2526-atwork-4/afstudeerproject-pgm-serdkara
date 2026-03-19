from flask import Flask
from flask_cors import CORS
from config import config_map
import os
from urllib.parse import urlparse


def _runtime_source_summary(database_url: str) -> dict[str, str]:
    parsed = urlparse(database_url)
    db_name = parsed.path.lstrip("/") or "unknown"
    return {
        "db_driver": parsed.scheme or "unknown",
        "db_host": parsed.hostname or "unknown",
        "db_port": str(parsed.port or "default"),
        "db_name": db_name,
        "checks_source": "database.framework_checks",
    }

def create_app(config_name="default") -> Flask:
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config_map[config_name])
    
    from app.models.db import db
    
    # Initialize extension CORS & DB
    CORS(app)
    db.init_app(app)

    source = _runtime_source_summary(app.config.get("SQLALCHEMY_DATABASE_URI", ""))
    app.logger.info(
        "Runtime source: db_driver=%s db_host=%s db_port=%s db_name=%s checks_source=%s db_fallback_active=%s",
        source["db_driver"],
        source["db_host"],
        source["db_port"],
        source["db_name"],
        source["checks_source"],
        bool(app.config.get("DATABASE_FALLBACK_ACTIVE", False)),
    )
    
    with app.app_context():
        from app.models import schema
        db.create_all()
    
    # Register blueprints (routes)
    from app.routes.validator import validator_bp
    from app.routes.data_manager import data_manager_bp
    from app.routes.golden_set import golden_set_bp
    from app.routes.settings import settings_bp
    from app.routes.auth import auth_bp
    
    app.register_blueprint(validator_bp, url_prefix='/api')
    app.register_blueprint(data_manager_bp, url_prefix='/api')
    app.register_blueprint(golden_set_bp, url_prefix='/api/golden-set')
    app.register_blueprint(settings_bp, url_prefix='/api/config')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return {'status': 'healthy'}, 200
        
    return app
