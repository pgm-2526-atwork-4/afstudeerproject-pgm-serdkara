import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration."""
    BASE_DIR = Path(__file__).resolve().parent
    DATA_DIR = BASE_DIR / "data"
    DOCUMENTS_DIR = DATA_DIR / "policies"
    BASELINES_DIR = DATA_DIR / "baselines"
    
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{DATA_DIR}/validator.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Ensure directories exist
    os.makedirs(DOCUMENTS_DIR, exist_ok=True)
    os.makedirs(BASELINES_DIR, exist_ok=True)
    
    # API Keys (Loaded from .env)
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
    
    # Max upload size (32MB)
    MAX_CONTENT_LENGTH = 32 * 1024 * 1024

class DevelopmentConfig(Config):
    DEBUG = True
    TESTING = False

class TestingConfig(Config):
    DEBUG = True
    TESTING = True

config_map = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig
}
