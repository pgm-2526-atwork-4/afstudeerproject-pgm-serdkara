from flask import Flask
from flask_cors import CORS
from config import config_map
import os

def create_app(config_name="default") -> Flask:
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config_map[config_name])
    
    from app.models.db import db
    
    # Initialize extension CORS & DB
    CORS(app)
    db.init_app(app)
    
    with app.app_context():
        from app.models import schema
        db.create_all()
    
    # Register blueprints (routes)
    from app.routes.validator import validator_bp
    from app.routes.data_manager import data_manager_bp
    
    app.register_blueprint(validator_bp, url_prefix='/api')
    app.register_blueprint(data_manager_bp, url_prefix='/api')
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return {'status': 'healthy'}, 200
        
    return app
