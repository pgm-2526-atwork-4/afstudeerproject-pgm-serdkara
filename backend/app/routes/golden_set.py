from flask import Blueprint, request, jsonify
from app.models.db import db
from app.models.schema import GoldenSetDb
import uuid
from app.services.llm_engine import LLMEngine

golden_set_bp = Blueprint('golden_set', __name__)

@golden_set_bp.route('/', methods=['GET'])
def get_golden_set():
    records = GoldenSetDb.query.all()
    res = []
    for r in records:
        res.append({
            "id": r.id,
            "check_id": r.check_id,
            "document_context": r.document_context,
            "expected_outcome": r.expected_outcome,
            "expected_evidence": r.expected_evidence,
            "created_at": r.created_at.isoformat()
        })
    return jsonify(res), 200

@golden_set_bp.route('/', methods=['POST'])
def add_golden_set():
    data = request.json
    new_record = GoldenSetDb(
        id=str(uuid.uuid4()),
        check_id=data['check_id'],
        document_context=data['document_context'],
        expected_outcome=data['expected_outcome'],
        expected_evidence=data['expected_evidence']
    )
    db.session.add(new_record)
    db.session.commit()
    return jsonify({"message": "Added successfully", "id": new_record.id}), 201

@golden_set_bp.route('/bulk', methods=['POST'])
def add_golden_set_bulk():
    data_list = request.json
    if not isinstance(data_list, list):
        return jsonify({"error": "Expected a JSON array"}), 400
        
    added = 0
    for data in data_list:
        new_record = GoldenSetDb(
            id=str(uuid.uuid4()),
            check_id=data.get('check_id', ''),
            document_context=data.get('document_context', ''),
            expected_outcome=data.get('expected_outcome', 'Pass'),
            expected_evidence=data.get('expected_evidence', '')
        )
        db.session.add(new_record)
        added += 1
        
    db.session.commit()
    return jsonify({"message": f"Successfully added {added} records"}), 201


@golden_set_bp.route('/<record_id>', methods=['DELETE'])
def delete_golden_set(record_id):
    record = GoldenSetDb.query.get(record_id)
    if not record:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(record)
    db.session.commit()
    return jsonify({"message": "Deleted successfully"}), 200

@golden_set_bp.route('/benchmark', methods=['POST'])
def run_benchmark():
    records = GoldenSetDb.query.all()
    if not records:
        return jsonify({"error": "Golden Set is empty"}), 400
        
    engine = LLMEngine()
    results = []
    correct_count = 0
    
    for r in records:
        # First we mock the extraction step (or we use the claim, wait, the golden set has the check, what's the claim?)
        # Let's say the extracted claim is the expected evidence for simplicity, or we should re-extract.
        # But wait, evaluate_faithfulness needs the extracted claim. Since in benchmarking we are testing Truthfulness & Reasoning...
        # Let's extract first.
        try:
            extraction_result = engine.extract_from_text(r.document_context, r.check_id)
            claim = extraction_result.get("extracted_text", "")
            
            evaluation = engine.evaluate_faithfulness(r.document_context, claim)
            
            # evaluate_faithfulness returns SOUND, INFERENCE, HALLUCINATION, INCOHERENT, and a PASS/FAIL verdict
            verdict = evaluation.get("verdict", "FAIL")
            reasoning = evaluation.get("reasoning", "")
            classification = evaluation.get("classification", "UNKNOWN")
            
            is_correct = (verdict.upper() == r.expected_outcome.upper())
            if is_correct:
                correct_count += 1
                
            results.append({
                "golden_id": r.id,
                "check_id": r.check_id,
                "expected_outcome": r.expected_outcome,
                "actual_verdict": verdict,
                "actual_classification": classification,
                "reasoning": reasoning,
                "is_correct": is_correct
            })
        except Exception as e:
            results.append({
                "golden_id": r.id,
                "error": str(e),
                "is_correct": False
            })
            
    agreement_rate = (correct_count / len(records)) * 100 if records else 0
    
    return jsonify({
        "agreement_rate": agreement_rate,
        "total": len(records),
        "correct": correct_count,
        "details": results
    }), 200
