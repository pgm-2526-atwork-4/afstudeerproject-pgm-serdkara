import os
from pathlib import Path
from flask import Blueprint, jsonify, request
from dotenv import set_key, load_dotenv

settings_bp = Blueprint('settings', __name__)

# Find the .env file in the backend directory
BACKEND_DIR = Path(__file__).parent.parent.parent
ENV_PATH = BACKEND_DIR / '.env'

@settings_bp.route('/llm', methods=['GET'])
def get_llm_config():
    """Reads the current LLM configuration from the environment/env file."""
    # Ensure we have the latest from .env, though os.environ might have the loaded ones
    # It's better to read directly from .env file to be safe what's persisted
    
    # We load to a dict mimicking the env
    if not ENV_PATH.exists():
        return jsonify(error=".env file not found"), 404
        
    import dotenv
    env_vars = dotenv.dotenv_values(ENV_PATH)
    
    extraction_model = env_vars.get("LLM_EXTRACTION_MODEL", "openai/gpt-4o-mini")
    judge_model = env_vars.get("LLM_JUDGE_MODEL", "anthropic/claude-3.5-sonnet-20240620")
    
    return jsonify({
        "extraction_model": extraction_model,
        "judge_model": judge_model
    }), 200

@settings_bp.route('/llm', methods=['POST'])
def update_llm_config():
    """Updates the LLM configuration in the .env file."""
    if not request.is_json:
        return jsonify(error="Expected JSON payload"), 415
        
    data = request.get_json(silent=True)
    if not data:
        return jsonify(error="Invalid JSON"), 400
        
    extraction_model = data.get('extraction_model')
    judge_model = data.get('judge_model')
    
    if not ENV_PATH.exists():
        return jsonify(error=".env file not found"), 404
        
    try:
        # Update physical .env file
        if extraction_model:
            set_key(str(ENV_PATH), "LLM_EXTRACTION_MODEL", extraction_model)
            os.environ["LLM_EXTRACTION_MODEL"] = extraction_model
            
        if judge_model:
            set_key(str(ENV_PATH), "LLM_JUDGE_MODEL", judge_model)
            os.environ["LLM_JUDGE_MODEL"] = judge_model
            
        return jsonify({
            "message": "Configuration updated successfully",
            "extraction_model": extraction_model,
            "judge_model": judge_model
        }), 200
        
    except Exception as e:
        return jsonify(error=f"Failed to update configuration: {str(e)}"), 500
