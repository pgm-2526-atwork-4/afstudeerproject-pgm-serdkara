import os
from pathlib import Path
from flask import Blueprint, jsonify, request
from dotenv import set_key, load_dotenv
from app.services.llm_engine import LLMEngine

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
    extraction_temperature = float(env_vars.get("LLM_EXTRACTION_TEMPERATURE", "0.3"))
    extraction_max_tokens = int(env_vars.get("LLM_EXTRACTION_MAX_TOKENS", "2000"))
    extraction_top_p = float(env_vars.get("LLM_EXTRACTION_TOP_P", "0.9"))
    judge_max_tokens = int(env_vars.get("LLM_JUDGE_MAX_TOKENS", "1000"))
    judge_top_p = float(env_vars.get("LLM_JUDGE_TOP_P", "0.95"))
    judge_system_prompt = env_vars.get("JUDGE_SYSTEM_PROMPT", "You are a security policy validator. Your task is to evaluate extracted information from security documents and provide a verdict on whether the extraction satisfactorily answers the check requirement.")
    judge_evaluation_rubric = env_vars.get("JUDGE_EVALUATION_RUBRIC", "3. Consistency: Is it internally consistent and logical?\n   1=Major contradictions, 3=Mostly consistent, 5=Perfectly consistent\n\n4. Security Relevance: Does it directly address the security requirement?\n   1=No relevance, 3=Partial relevance, 5=Directly addresses requirement\n\n5. Traceability: Can the conclusions be traced back to the document?\n   1=No evidence, 3=Some evidence, 5=Clear and direct evidence")
    
    return jsonify({
        "extraction_model": extraction_model,
        "judge_model": judge_model,
        "extraction_temperature": extraction_temperature,
        "extraction_max_tokens": extraction_max_tokens,
        "extraction_top_p": extraction_top_p,
        "judge_max_tokens": judge_max_tokens,
        "judge_top_p": judge_top_p,
        "judge_system_prompt": judge_system_prompt,
        "judge_evaluation_rubric": judge_evaluation_rubric
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
    extraction_temperature = data.get('extraction_temperature')
    extraction_max_tokens = data.get('extraction_max_tokens')
    extraction_top_p = data.get('extraction_top_p')
    judge_max_tokens = data.get('judge_max_tokens')
    judge_top_p = data.get('judge_top_p')
    judge_system_prompt = data.get('judge_system_prompt')
    judge_evaluation_rubric = data.get('judge_evaluation_rubric')
    
    if not ENV_PATH.exists():
        return jsonify(error=".env file not found"), 404
        
    try:
        # Update physical .env file
        if extraction_model:
            set_key(str(ENV_PATH), "LLM_EXTRACTION_MODEL", str(extraction_model))
            os.environ["LLM_EXTRACTION_MODEL"] = str(extraction_model)
            
        if extraction_temperature is not None:
            set_key(str(ENV_PATH), "LLM_EXTRACTION_TEMPERATURE", str(extraction_temperature))
            os.environ["LLM_EXTRACTION_TEMPERATURE"] = str(extraction_temperature)

        if extraction_max_tokens is not None:
            set_key(str(ENV_PATH), "LLM_EXTRACTION_MAX_TOKENS", str(extraction_max_tokens))
            os.environ["LLM_EXTRACTION_MAX_TOKENS"] = str(extraction_max_tokens)
            
        if extraction_top_p is not None:
            set_key(str(ENV_PATH), "LLM_EXTRACTION_TOP_P", str(extraction_top_p))
            os.environ["LLM_EXTRACTION_TOP_P"] = str(extraction_top_p)
            
        if judge_model:
            set_key(str(ENV_PATH), "LLM_JUDGE_MODEL", str(judge_model))
            os.environ["LLM_JUDGE_MODEL"] = str(judge_model)

        if judge_max_tokens is not None:
            set_key(str(ENV_PATH), "LLM_JUDGE_MAX_TOKENS", str(judge_max_tokens))
            os.environ["LLM_JUDGE_MAX_TOKENS"] = str(judge_max_tokens)
            
        if judge_top_p is not None:
            set_key(str(ENV_PATH), "LLM_JUDGE_TOP_P", str(judge_top_p))
            os.environ["LLM_JUDGE_TOP_P"] = str(judge_top_p)

        if judge_system_prompt is not None:
            set_key(str(ENV_PATH), "JUDGE_SYSTEM_PROMPT", judge_system_prompt)
            os.environ["JUDGE_SYSTEM_PROMPT"] = judge_system_prompt
            
        if judge_evaluation_rubric is not None:
            set_key(str(ENV_PATH), "JUDGE_EVALUATION_RUBRIC", judge_evaluation_rubric)
            os.environ["JUDGE_EVALUATION_RUBRIC"] = judge_evaluation_rubric
            
        return jsonify({
            "message": "Configuration updated successfully",
            "extraction_model": extraction_model,
            "judge_model": judge_model,
            "extraction_temperature": extraction_temperature,
            "extraction_max_tokens": extraction_max_tokens,
            "extraction_top_p": extraction_top_p,
            "judge_max_tokens": judge_max_tokens,
            "judge_top_p": judge_top_p,
            "judge_system_prompt": judge_system_prompt,
            "judge_evaluation_rubric": judge_evaluation_rubric
        }), 200
        
    except Exception as e:
        return jsonify(error=f"Failed to update configuration: {str(e)}"), 500


@settings_bp.route('/llm/test-judge', methods=['POST'])
def test_judge_rubric():
    """Runs a real judge test over provided source text and claim using optional prompt/rubric overrides."""
    if not request.is_json:
        return jsonify(error="Expected JSON payload"), 415

    data = request.get_json(silent=True) or {}
    source_text = str(data.get('source_text', '')).strip()
    claim = str(data.get('claim', '')).strip()
    system_prompt = str(data.get('system_prompt', '')).strip()
    rubric = str(data.get('rubric', '')).strip()

    if not source_text or not claim:
        return jsonify(error="Missing required fields: source_text and claim"), 400

    merged_system_prompt = system_prompt
    if rubric:
        merged_system_prompt = f"{system_prompt}\n\nEvaluation Rubric:\n{rubric}" if system_prompt else f"Evaluation Rubric:\n{rubric}"

    try:
        engine = LLMEngine()
        result = engine.evaluate_faithfulness_custom(
            document_text=source_text,
            claim=claim,
            system_prompt_override=merged_system_prompt if merged_system_prompt else None,
        )
        return jsonify(result), 200
    except Exception as e:
        return jsonify(error=f"Judge test failed: {str(e)}"), 500
