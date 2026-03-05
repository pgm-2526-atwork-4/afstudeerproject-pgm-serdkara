from flask import Blueprint, jsonify, request
from app.models.domain import RunRequest, EvidenceType
from app.services.run_manager import RunManager
from app.services.storage_service import StorageService
from app.services.llm_engine import LLMEngine
from app.services.evaluator import EvaluatorService
import uuid

validator_bp = Blueprint('validator', __name__)

@validator_bp.route('/analyze', methods=['POST'])
def analyze_document():
    """
    Triggers an analysis run.
    Validates the RunRequest payload.
    """
    if not request.is_json:
        return jsonify(error="Content-Type must be application/json"), 415

    data = request.get_json(silent=True)
    if not data:
        return jsonify(error="Invalid JSON payload"), 400
        
    try:
        raw_evidence_types = data.get("evidence_types", [])
        evidence_types = [EvidenceType(**ev) for ev in raw_evidence_types]
        run_req = RunRequest(
            document_id=data.get("document_id"),
            evidence_types=evidence_types
        )
    except Exception as e:
        return jsonify(error=f"Validation error: {str(e)}"), 400

    storage = StorageService()
    llm = LLMEngine()
    evaluator = EvaluatorService()
    manager = RunManager(storage, llm, evaluator)
    
    try:
        run_result = manager.start_run(run_req)
        return jsonify(run_result.model_dump()), 202
    except ValueError as e:
        return jsonify(error=str(e)), 404
    except Exception as e:
        return jsonify(error=f"Run failed: {str(e)}"), 500

@validator_bp.route('/runs/<run_id>', methods=['GET'])
def get_run_status(run_id):
    """
    Retrieves the status/results of a specific run.
    """
    storage = StorageService()
    llm = LLMEngine()
    evaluator = EvaluatorService()
    manager = RunManager(storage, llm, evaluator)
    
    run_data = manager.get_run_status(run_id)
    if not run_data:
        return jsonify(error="Run not found"), 404
        
    return jsonify(run_data), 200

@validator_bp.route('/reviews', methods=['POST'])
def submit_review():
    """
    Submits a human review (Agree/Disagree/Flag) for a specific extraction.
    """
    if not request.is_json:
        return jsonify(error="Expected JSON payload"), 415
        
    data = request.get_json(silent=True)
    run_id = data.get('run_id')
    check_id = data.get('check_id')
    status = data.get('status')
    comments = data.get('comments', '')
    
    if not all([run_id, check_id, status]):
        return jsonify(error="Missing required fields: run_id, check_id, status"), 400
        
    if status not in ['agree', 'disagree', 'flag']:
        return jsonify(error="Status must be agree, disagree, or flag"), 400

    storage = StorageService()
    manager = RunManager(storage, LLMEngine(), EvaluatorService())
    
    try:
        updated = manager.submit_review(run_id, check_id, status, comments)
        return jsonify(updated), 201
    except Exception as e:
        return jsonify(error=str(e)), 500

@validator_bp.route('/runs/<run_id>/re-extract', methods=['POST'])
def re_extract(run_id):
    if not request.is_json:
         return jsonify(error="Expected JSON payload"), 415
    data = request.get_json(silent=True)
    check_id = data.get('check_id')
    if not check_id:
         return jsonify(error="missing check_id"), 400
         
    storage = StorageService()
    manager = RunManager(storage, LLMEngine(), EvaluatorService())
    try:
        updated = manager.re_extract(run_id, check_id)
        return jsonify(updated), 200
    except Exception as e:
        return jsonify(error=str(e)), 500
        
@validator_bp.route('/runs/<run_id>/re-judge', methods=['POST'])
def re_judge(run_id):
    if not request.is_json:
         return jsonify(error="Expected JSON payload"), 415
    data = request.get_json(silent=True)
    check_id = data.get('check_id')
    if not check_id:
         return jsonify(error="missing check_id"), 400
         
    storage = StorageService()
    manager = RunManager(storage, LLMEngine(), EvaluatorService())
    try:
        updated = manager.re_judge(run_id, check_id)
        return jsonify(updated), 200
    except Exception as e:
        return jsonify(error=str(e)), 500
