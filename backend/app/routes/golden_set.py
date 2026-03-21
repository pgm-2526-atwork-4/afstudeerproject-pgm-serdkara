from flask import Blueprint, request, jsonify
from app.models.db import db
from app.models.schema import GoldenSetDb, BenchmarkSnapshotDb
import uuid
import re
from datetime import datetime, UTC
from typing import Any, cast
from app.services.llm_engine import LLMEngine

golden_set_bp = Blueprint('golden_set', __name__)


def _load_benchmark_history() -> list[dict[str, Any]]:
    rows = cast(
        list[BenchmarkSnapshotDb],
        BenchmarkSnapshotDb.query.order_by(BenchmarkSnapshotDb.timestamp.asc()).all(),
    )
    history: list[dict[str, Any]] = []
    for row in rows:
        row_any = cast(Any, row)
        history.append({
            "timestamp": row.timestamp.isoformat() if row.timestamp else None,
            "agreement_rate": row.agreement_rate,
            "total": row.total,
            "correct": row.correct,
            "mismatches": row.mismatches,
            "per_check": cast(dict[str, Any], row_any.per_check or {}),
        })
    return history


def _save_benchmark_history(history: list[dict[str, Any]]) -> None:
    db.session.query(BenchmarkSnapshotDb).delete()
    for item in history:
        raw_ts = item.get("timestamp")
        ts = datetime.fromisoformat(raw_ts) if isinstance(raw_ts, str) and raw_ts else datetime.now(UTC)
        row = BenchmarkSnapshotDb()
        row.timestamp = ts
        row.agreement_rate = float(item.get("agreement_rate", 0.0) or 0.0)
        row.total = int(item.get("total", 0) or 0)
        row.correct = int(item.get("correct", 0) or 0)
        row.mismatches = int(item.get("mismatches", 0) or 0)
        row.per_check = item.get("per_check") or {}
        db.session.add(row)
    db.session.commit()


def _build_per_check_summary(results: list[dict[str, Any]]) -> dict[str, dict[str, float | int]]:
    bucket: dict[str, dict[str, int]] = {}
    for item in results:
        check_id = _normalize_check_id(str(item.get('check_id', '')).strip())
        if not check_id:
            continue
        if check_id not in bucket:
            bucket[check_id] = {'total': 0, 'correct': 0}
        bucket[check_id]['total'] += 1
        if item.get('is_correct') is True:
            bucket[check_id]['correct'] += 1

    summary: dict[str, dict[str, float | int]] = {}
    for check_id, stats in bucket.items():
        total = stats['total']
        correct = stats['correct']
        summary[check_id] = {
            'total': total,
            'correct': correct,
            'agreement_rate': (correct / total) * 100 if total else 0,
        }
    return summary


def _normalize_key(key: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', str(key).strip().lower())


def _pick_value(payload: Any, aliases: list[str], default: str = '') -> str:
    if not isinstance(payload, dict):
        return default

    payload_dict = cast(dict[Any, Any], payload)
    normalized_payload: dict[str, Any] = {
        _normalize_key(str(k)): v for k, v in payload_dict.items()
    }
    for alias in aliases:
        value = normalized_payload.get(_normalize_key(alias))
        if value is None:
            continue
        if isinstance(value, str):
            text = value.strip()
            if text:
                return text
            continue
        text = str(value).strip()
        if text:
            return text
    return default


def _normalize_check_id(raw_check_id: str) -> str:
    check_id = str(raw_check_id or '').strip()
    if not check_id:
        return ''

    if check_id.upper().startswith('TEST_'):
        check_id = check_id[5:]

    # Convert underscore notation to dot notation (e.g. 9_1_10 -> 9.1.10)
    if re.fullmatch(r'\d+(?:_\d+)+', check_id):
        check_id = check_id.replace('_', '.')

    return check_id


def _normalize_expected_outcome(raw_outcome: str) -> str:
    outcome = str(raw_outcome or '').strip().lower()
    if not outcome:
        return 'Pass'

    pass_aliases = {
        'pass', 'passed', 'true', 'yes', 'compliant', 'present', 'found', 'correct'
    }
    fail_aliases = {
        'fail', 'failed', 'false', 'no', 'noncompliant', 'notcompliant', 'absent', 'notfound', 'incorrect'
    }

    compact = re.sub(r'\s+', '', outcome)
    if outcome in pass_aliases or compact in pass_aliases:
        return 'Pass'
    if outcome in fail_aliases or compact in fail_aliases:
        return 'Fail'

    return str(raw_outcome).strip() or 'Pass'


def _normalize_golden_entry(data: dict[str, Any]) -> dict[str, str]:
    check_id = _normalize_check_id(_pick_value(data, [
        'check_id', 'check id', 'checkid', 'check', 'check_code', 'check code',
        'evidence_type_value', 'evidence type value', 'id'
    ]))

    document_context = _pick_value(data, [
        'document_context', 'document context', 'context/document quote',
        'context_document_quote', 'context quote', 'document quote', 'context',
        'quote', 'snippet', 'value'
    ])

    expected_outcome = _normalize_expected_outcome(_pick_value(data, [
        'expected_outcome', 'expected outcome', 'expected_result',
        'expected result', 'expected verdict', 'verdict', 'result', 'outcome'
    ], default='Pass'))

    expected_evidence = _pick_value(data, [
        'expected_evidence', 'expected evidence', 'evidence',
        'expected_rationale', 'expected rationale', 'rationale', 'reasoning'
    ])

    return {
        'check_id': check_id,
        'document_context': document_context,
        'expected_outcome': expected_outcome,
        'expected_evidence': expected_evidence,
    }

@golden_set_bp.route('', methods=['GET'])
@golden_set_bp.route('/', methods=['GET'])
def get_golden_set():
    records = cast(list[GoldenSetDb], GoldenSetDb.query.all())
    res: list[dict[str, Any]] = []
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

@golden_set_bp.route('', methods=['POST'])
@golden_set_bp.route('/', methods=['POST'])
def add_golden_set():
    raw_data = request.get_json(silent=True)
    if not isinstance(raw_data, dict):
        return jsonify({"error": "Expected JSON object"}), 400
    data = cast(dict[str, Any], raw_data)

    if not all(k in data for k in ["check_id", "document_context", "expected_outcome", "expected_evidence"]):
        return jsonify({"error": "Missing required fields"}), 400

    new_record = GoldenSetDb()
    new_record.id = str(uuid.uuid4())
    new_record.check_id = str(data["check_id"])
    new_record.document_context = str(data["document_context"])
    new_record.expected_outcome = str(data["expected_outcome"])
    new_record.expected_evidence = str(data["expected_evidence"])
    db.session.add(new_record)
    db.session.commit()
    return jsonify({"message": "Added successfully", "id": new_record.id}), 201

@golden_set_bp.route('/bulk', methods=['POST'])
def add_golden_set_bulk():
    raw_data_list = request.get_json(silent=True)
    if not isinstance(raw_data_list, list):
        return jsonify({"error": "Expected a JSON array"}), 400
    data_list = cast(list[Any], raw_data_list)
    
    added = 0
    skipped = 0
    for data in data_list:
        if not isinstance(data, dict):
            skipped += 1
            continue

        row_data = cast(dict[str, Any], data)

        normalized = _normalize_golden_entry(row_data)
        if not normalized['check_id']:
            skipped += 1
            continue

        new_record = GoldenSetDb()
        new_record.id = str(uuid.uuid4())
        new_record.check_id = normalized['check_id']
        new_record.document_context = normalized['document_context']
        new_record.expected_outcome = normalized['expected_outcome']
        new_record.expected_evidence = normalized['expected_evidence']
        db.session.add(new_record)
        added += 1

    db.session.commit()
    return jsonify({
        "message": f"Successfully added {added} records",
        "added": added,
        "skipped": skipped
    }), 201


@golden_set_bp.route('/<record_id>', methods=['DELETE'])
def delete_golden_set(record_id: str):
    record = GoldenSetDb.query.get(record_id)
    if not record:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(record)
    db.session.commit()
    return jsonify({"message": "Deleted successfully"}), 200

@golden_set_bp.route('/benchmark', methods=['POST'])
def run_benchmark():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        payload = {}
    payload = cast(dict[str, Any], payload)

    selected_check_id = _normalize_check_id(str(payload.get('selected_check_id', '')).strip())

    records = cast(list[GoldenSetDb], GoldenSetDb.query.all())
    if not records:
        return jsonify({"error": "Ground Truth Baselines are empty"}), 400

    if selected_check_id:
        records.sort(
            key=lambda r: 0 if _normalize_check_id(str(r.check_id).strip()) == selected_check_id else 1
        )
        
    engine = LLMEngine()
    engine_any = cast(Any, engine)
    results: list[dict[str, Any]] = []
    correct_count = 0
    
    for r in records:
        # First we mock the extraction step (or we use the claim, wait, the golden set has the check, what's the claim?)
        # Let's say the extracted claim is the expected evidence for simplicity, or we should re-extract.
        # But wait, evaluate_faithfulness needs the extracted claim. Since in benchmarking we are testing Truthfulness & Reasoning...
        # Let's extract first.
        try:
            extraction_result = cast(dict[str, Any], engine_any.extract_from_text(r.document_context, r.check_id))
            claim = extraction_result.get("extracted_text", "")
            
            evaluation = cast(dict[str, Any], engine_any.evaluate_faithfulness(r.document_context, claim))
            
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
                "normalized_check_id": _normalize_check_id(str(r.check_id).strip()),
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
    per_check = _build_per_check_summary(results)

    snapshot: dict[str, Any] = {
        'timestamp': datetime.now(UTC).isoformat(),
        'agreement_rate': agreement_rate,
        'total': len(records),
        'correct': correct_count,
        'mismatches': len(records) - correct_count,
        'per_check': per_check,
    }
    history = _load_benchmark_history()
    history.append(snapshot)
    # Keep latest 200 snapshots to avoid unbounded growth.
    if len(history) > 200:
        history = history[-200:]
    _save_benchmark_history(history)

    return jsonify({
        "agreement_rate": agreement_rate,
        "total": len(records),
        "correct": correct_count,
        "details": results,
        "per_check": per_check,
        "timestamp": snapshot['timestamp']
    }), 200


@golden_set_bp.route('/benchmark/latest', methods=['GET'])
def get_latest_benchmark():
    history = _load_benchmark_history()
    latest = history[-1] if history else None
    return jsonify({"latest": latest}), 200


@golden_set_bp.route('/benchmark/history', methods=['GET'])
def get_benchmark_history():
    history = _load_benchmark_history()
    # Return only chart/KPI fields to keep response lightweight.
    compact: list[dict[str, Any]] = [
        {
            'timestamp': item.get('timestamp'),
            'agreement_rate': item.get('agreement_rate', 0),
            'total': item.get('total', 0),
            'correct': item.get('correct', 0),
            'mismatches': item.get('mismatches', 0),
        }
        for item in history
    ]
    return jsonify({"history": compact}), 200
