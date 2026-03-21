import os
from pathlib import Path
from flask import Blueprint, jsonify, request, current_app
from dotenv import set_key
from app.services.llm_engine import LLMEngine
from urllib.parse import urlparse
from app.models.db import db
from app.models.schema import AppConfigDb

settings_bp = Blueprint('settings', __name__)

# Find the .env file in the backend directory
BACKEND_DIR = Path(__file__).parent.parent.parent
ENV_PATH = BACKEND_DIR / '.env'


DEFAULT_LLM_CONFIG = {
    "LLM_EXTRACTION_MODEL": "openai/gpt-4o-mini",
    "LLM_JUDGE_MODEL": "anthropic/claude-3.5-sonnet-20240620",
    "LLM_EXTRACTION_TEMPERATURE": "0.3",
    "LLM_EXTRACTION_MAX_TOKENS": "2000",
    "LLM_EXTRACTION_TOP_P": "0.9",
    "LLM_JUDGE_MAX_TOKENS": "1000",
    "LLM_JUDGE_TOP_P": "0.95",
    "JUDGE_SYSTEM_PROMPT": "You are a security policy validator. Your task is to evaluate extracted information from security documents and provide a verdict on whether the extraction satisfactorily answers the check requirement.",
    "JUDGE_EVALUATION_RUBRIC": "3. Consistency: Is it internally consistent and logical?\\n   1=Major contradictions, 3=Mostly consistent, 5=Perfectly consistent\\n\\n4. Security Relevance: Does it directly address the security requirement?\\n   1=No relevance, 3=Partial relevance, 5=Directly addresses requirement\\n\\n5. Traceability: Can the conclusions be traced back to the document?\\n   1=No evidence, 3=Some evidence, 5=Clear and direct evidence",
}


def _db_config_value(key: str) -> str | None:
    row = db.session.get(AppConfigDb, key)
    return row.value if row else None


def _env_file_value(key: str) -> str | None:
    if not ENV_PATH.exists():
        return None
    import dotenv
    env_vars = dotenv.dotenv_values(ENV_PATH)
    value = env_vars.get(key)
    if value is None:
        return None
    return str(value)


def _resolved_config_value(key: str) -> str:
    db_value = _db_config_value(key)
    if db_value not in (None, ""):
        return db_value

    env_value = os.getenv(key)
    if env_value not in (None, ""):
        return str(env_value)

    file_value = _env_file_value(key)
    if file_value not in (None, ""):
        return str(file_value)

    return DEFAULT_LLM_CONFIG.get(key, "")


def _set_config_value(key: str, value: str) -> None:
    row = db.session.get(AppConfigDb, key)
    if row:
        row.value = value
    else:
        db.session.add(AppConfigDb(key=key, value=value))

    os.environ[key] = value
    if ENV_PATH.exists():
        try:
            set_key(str(ENV_PATH), key, value)
        except Exception:
            # Runtime DB persistence remains source of truth in production.
            pass


@settings_bp.route('/runtime-source', methods=['GET'])
def get_runtime_source():
    """Shows active DB target and checks library source for debugging environment issues."""
    database_url = str(current_app.config.get("SQLALCHEMY_DATABASE_URI", ""))
    parsed = urlparse(database_url) if database_url else None

    return jsonify({
        "database": {
            "configured": bool(database_url),
            "driver": parsed.scheme if parsed else None,
            "host": parsed.hostname if parsed else None,
            "port": parsed.port if parsed else None,
            "name": (parsed.path.lstrip('/') if parsed and parsed.path else None),
            "fallback_active": bool(current_app.config.get("DATABASE_FALLBACK_ACTIVE", False)),
        },
        "checks_source": {
            "type": "database",
            "table": "framework_checks",
        }
    }), 200

@settings_bp.route('/llm', methods=['GET'])
def get_llm_config():
    """Reads current LLM configuration with DB persistence and env fallback."""
    extraction_model = _resolved_config_value("LLM_EXTRACTION_MODEL")
    judge_model = _resolved_config_value("LLM_JUDGE_MODEL")
    extraction_temperature = float(_resolved_config_value("LLM_EXTRACTION_TEMPERATURE") or "0.3")
    extraction_max_tokens = int(_resolved_config_value("LLM_EXTRACTION_MAX_TOKENS") or "2000")
    extraction_top_p = float(_resolved_config_value("LLM_EXTRACTION_TOP_P") or "0.9")
    judge_max_tokens = int(_resolved_config_value("LLM_JUDGE_MAX_TOKENS") or "1000")
    judge_top_p = float(_resolved_config_value("LLM_JUDGE_TOP_P") or "0.95")
    judge_system_prompt = _resolved_config_value("JUDGE_SYSTEM_PROMPT")
    judge_evaluation_rubric = _resolved_config_value("JUDGE_EVALUATION_RUBRIC")
    
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
    """Updates LLM config and persists it in the database (plus env/.env best-effort sync)."""
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
    
    try:
        if extraction_model is not None:
            _set_config_value("LLM_EXTRACTION_MODEL", str(extraction_model))
            
        if extraction_temperature is not None:
            _set_config_value("LLM_EXTRACTION_TEMPERATURE", str(extraction_temperature))

        if extraction_max_tokens is not None:
            _set_config_value("LLM_EXTRACTION_MAX_TOKENS", str(extraction_max_tokens))
            
        if extraction_top_p is not None:
            _set_config_value("LLM_EXTRACTION_TOP_P", str(extraction_top_p))
            
        if judge_model is not None:
            _set_config_value("LLM_JUDGE_MODEL", str(judge_model))

        if judge_max_tokens is not None:
            _set_config_value("LLM_JUDGE_MAX_TOKENS", str(judge_max_tokens))
            
        if judge_top_p is not None:
            _set_config_value("LLM_JUDGE_TOP_P", str(judge_top_p))

        if judge_system_prompt is not None:
            _set_config_value("JUDGE_SYSTEM_PROMPT", str(judge_system_prompt))
            
        if judge_evaluation_rubric is not None:
            _set_config_value("JUDGE_EVALUATION_RUBRIC", str(judge_evaluation_rubric))

        db.session.commit()

        extraction_model = _resolved_config_value("LLM_EXTRACTION_MODEL")
        judge_model = _resolved_config_value("LLM_JUDGE_MODEL")
        extraction_temperature = float(_resolved_config_value("LLM_EXTRACTION_TEMPERATURE") or "0.3")
        extraction_max_tokens = int(_resolved_config_value("LLM_EXTRACTION_MAX_TOKENS") or "2000")
        extraction_top_p = float(_resolved_config_value("LLM_EXTRACTION_TOP_P") or "0.9")
        judge_max_tokens = int(_resolved_config_value("LLM_JUDGE_MAX_TOKENS") or "1000")
        judge_top_p = float(_resolved_config_value("LLM_JUDGE_TOP_P") or "0.95")
        judge_system_prompt = _resolved_config_value("JUDGE_SYSTEM_PROMPT")
        judge_evaluation_rubric = _resolved_config_value("JUDGE_EVALUATION_RUBRIC")
            
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
        db.session.rollback()
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
