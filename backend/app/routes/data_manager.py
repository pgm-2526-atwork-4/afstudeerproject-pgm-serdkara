from flask import Blueprint, jsonify, request, send_file, g
from app.services.storage_service import StorageService
from app.services.llm_engine import LLMEngine
from app.services.evaluator import EvaluatorService
from app.services.run_manager import RunManager
from app.utils.helpers import secure_filename_preserve_ext, extract_document_paragraphs
from app.utils.checks_library import (
    flatten_checks_library,
    summarize_check_library,
    analyze_library_structure,
)
from app.models.schema import CheckResultDb, RunDb, DocumentDb, FrameworkCheckDb
from app.models.db import db
import werkzeug
import uuid
import io
from datetime import datetime, UTC
import json
from sqlalchemy import func
from app.routes.auth import require_auth
from app.models.schema import RunOwnerDb

data_manager_bp = Blueprint('data_manager', __name__)

@data_manager_bp.route('/files', methods=['GET'])
@require_auth
def list_files():
    """Returns a list of all uploaded documents."""
    storage = StorageService()
    manager = RunManager(storage, LLMEngine(), EvaluatorService())
    
    docs = storage.list_documents()
    res = []
    for doc in docs:
        doc_dump = doc.model_dump()
        runs = manager.get_runs_for_document(doc.id, user_id=g.current_user.id)
        if runs:
            doc_dump['latest_run_id'] = runs[0]['run_id']
            doc_dump['latest_run_status'] = runs[0].get('status', 'unknown')
        else:
            doc_dump['latest_run_id'] = None
            doc_dump['latest_run_status'] = None
        res.append(doc_dump)
        
    return jsonify(res), 200

@data_manager_bp.route('/upload', methods=['POST'])
def upload_file():
    """Handles document uploads."""
    if 'file' not in request.files:
        return jsonify(error="No file part"), 400

    upfile = request.files['file']
    if upfile.filename == '':
        return jsonify(error="No selected file"), 400
        
    secure_name = secure_filename_preserve_ext(upfile.filename)
    if not secure_name:
         return jsonify(error="Invalid filename"), 400
         
    storage = StorageService()
    try:
        doc = storage.save_document(upfile, secure_name)
        return jsonify(doc.model_dump()), 201
    except FileExistsError:
        return jsonify(error="Filename already exists!"), 400
    except werkzeug.exceptions.RequestEntityTooLarge:
        return jsonify(error="File too large"), 413
    except Exception as e:
        return jsonify(error=f"Unexpected error: {str(e)}"), 500

@data_manager_bp.route('/checks/upload', methods=['POST'])
def upload_checks_library():
    """Uploads checks JSON and stores parsed checks in the database."""
    if 'file' not in request.files:
        return jsonify(error="No file part"), 400

    upfile = request.files['file']
    if upfile.filename == '':
        return jsonify(error="No selected file"), 400
        
    if not upfile.filename.endswith('.json'):
        return jsonify(error="Only JSON files are allowed"), 400

    try:
        raw_content = upfile.read()
        parsed = json.loads(raw_content.decode('utf-8-sig'))
        flat_checks = flatten_checks_library(parsed)

        if not flat_checks:
            return jsonify(error="Uploaded JSON is valid, but no checks could be parsed from it."), 400

        db.session.query(FrameworkCheckDb).delete()
        now = datetime.now(UTC)
        for chk in flat_checks:
            db.session.add(FrameworkCheckDb(
                check_id=str(chk.get("id", "")).strip(),
                name=str(chk.get("name", "")).strip() or "Unnamed Check",
                prompt=str(chk.get("prompt", "")).strip(),
                category=str(chk.get("category", "Uncategorized")).strip() or "Uncategorized",
                few_shot=str(chk.get("few_shot", "")).strip() or None,
                judge_override=str(chk.get("judge_override", "")).strip() or None,
                updated_at=now,
            ))
        db.session.commit()

        summary = summarize_check_library(flat_checks)
        structure = analyze_library_structure(parsed)
        warning = None
        if structure.get("subdomains_count", 0) > 0 and structure.get("empty_subdomains_count", 0) > 0:
            warning = (
                f"{structure.get('empty_subdomains_count')} of {structure.get('subdomains_count')} subdomains "
                "have no checks in this file."
            )
        return jsonify({
            "message": "Checks library stored in database successfully",
            **summary,
            **structure,
            "warning": warning,
        }), 200
    except json.JSONDecodeError as e:
        return jsonify(error=f"Invalid JSON file: {str(e)}"), 400
    except Exception as e:
        return jsonify(error=f"Failed to save file: {str(e)}"), 500

@data_manager_bp.route('/checks', methods=['GET'])
@require_auth
def list_checks():
    """Returns available checks from the framework_checks database table."""
    try:
        checks_rows = FrameworkCheckDb.query.order_by(FrameworkCheckDb.category.asc(), FrameworkCheckDb.check_id.asc()).all()

        flat_checks = [
            {
                "id": row.check_id,
                "name": row.name,
                "prompt": row.prompt,
                "category": row.category,
                "few_shot": row.few_shot or "",
                "judge_override": row.judge_override or "",
                "last_modified": row.updated_at.isoformat() if row.updated_at else None,
            }
            for row in checks_rows
        ]

        usage_rows = (
            CheckResultDb.query
            .join(RunDb, CheckResultDb.run_id == RunDb.id)
            .join(RunOwnerDb, RunOwnerDb.run_id == RunDb.id)
            .filter(RunOwnerDb.user_id == g.current_user.id)
            .with_entities(
                CheckResultDb.check_id,
                func.count(CheckResultDb.id),
                func.max(RunDb.timestamp),
            )
            .group_by(CheckResultDb.check_id)
            .all()
        )
        usage_map = {
            str(check_id): {
                "usage": int(count or 0),
                "last_modified": max_ts.isoformat() if max_ts else None,
            }
            for check_id, count, max_ts in usage_rows
        }

        for chk in flat_checks:
            stats = usage_map.get(str(chk.get("id", "")), {})
            chk["usage"] = int(stats.get("usage", 0))
            chk["last_modified"] = stats.get("last_modified") or chk.get("last_modified")
        return jsonify(flat_checks), 200
    except Exception as e:
        return jsonify(error=f"Failed to load checks: {str(e)}"), 500


@data_manager_bp.route('/checks', methods=['POST'])
def create_check():
    if not request.is_json:
        return jsonify(error="Expected JSON payload"), 415

    payload = request.get_json(silent=True) or {}
    check_id = str(payload.get("id", "")).strip()
    name = str(payload.get("name", "")).strip()
    prompt = str(payload.get("prompt", "")).strip()
    category = str(payload.get("category", "")).strip()

    if not all([check_id, name, prompt, category]):
        return jsonify(error="Missing required fields: id, name, prompt, category"), 400

    try:
        existing = db.session.get(FrameworkCheckDb, check_id)
        if existing:
            return jsonify(error=f"Check '{check_id}' already exists"), 409

        db.session.add(FrameworkCheckDb(
            check_id=check_id,
            name=name,
            prompt=prompt,
            category=category,
            few_shot=str(payload.get("few_shot", "")).strip() or None,
            judge_override=str(payload.get("judge_override", "")).strip() or None,
            updated_at=datetime.now(UTC),
        ))
        db.session.commit()
        return jsonify(message="Check created", check_id=check_id), 201
    except Exception as e:
        return jsonify(error=f"Failed to create check: {str(e)}"), 500


@data_manager_bp.route('/checks/<check_id>', methods=['PUT'])
def update_check(check_id):
    if not request.is_json:
        return jsonify(error="Expected JSON payload"), 415

    payload = request.get_json(silent=True) or {}
    payload["id"] = str(check_id).strip()
    if not str(payload.get("name", "")).strip() or not str(payload.get("prompt", "")).strip() or not str(payload.get("category", "")).strip():
        return jsonify(error="Missing required fields: name, prompt, category"), 400

    try:
        existing = db.session.get(FrameworkCheckDb, check_id)
        if not existing:
            return jsonify(error=f"Check '{check_id}' not found"), 404

        existing.name = str(payload.get("name", "")).strip()
        existing.prompt = str(payload.get("prompt", "")).strip()
        existing.category = str(payload.get("category", "")).strip()
        existing.few_shot = str(payload.get("few_shot", "")).strip() or None
        existing.judge_override = str(payload.get("judge_override", "")).strip() or None
        existing.updated_at = datetime.now(UTC)
        db.session.commit()
        return jsonify(message="Check updated", check_id=check_id), 200
    except Exception as e:
        return jsonify(error=f"Failed to update check: {str(e)}"), 500


@data_manager_bp.route('/checks/<check_id>', methods=['DELETE'])
def remove_check(check_id):
    cid = str(check_id).strip()
    if not cid:
        return jsonify(error="Missing check id"), 400

    try:
        existing = db.session.get(FrameworkCheckDb, cid)
        if not existing:
            return jsonify(error=f"Check '{cid}' not found"), 404

        db.session.delete(existing)
        db.session.commit()
        return jsonify(message="Check deleted", check_id=cid), 200
    except Exception as e:
        return jsonify(error=f"Failed to delete check: {str(e)}"), 500

@data_manager_bp.route('/reports/agreement', methods=['GET'])
@require_auth
def get_agreement_report():
    """Returns agreement metrics for the dashboard."""
    try:
        total_documents = db.session.query(func.count(DocumentDb.id)).scalar() or 0
        total_runs = (
            db.session.query(func.count(RunDb.id))
            .join(RunOwnerDb, RunOwnerDb.run_id == RunDb.id)
            .filter(RunOwnerDb.user_id == g.current_user.id)
            .scalar()
            or 0
        )
        average_score = (
            db.session.query(func.avg(CheckResultDb.judge_score))
            .join(RunDb, CheckResultDb.run_id == RunDb.id)
            .join(RunOwnerDb, RunOwnerDb.run_id == RunDb.id)
            .filter(RunOwnerDb.user_id == g.current_user.id)
            .filter(CheckResultDb.judge_score.isnot(None))
            .scalar()
        )

        review_rows = (
            db.session.query(
                CheckResultDb.human_review_status,
                func.count(CheckResultDb.id)
            )
            .join(RunDb, CheckResultDb.run_id == RunDb.id)
            .join(RunOwnerDb, RunOwnerDb.run_id == RunDb.id)
            .filter(RunOwnerDb.user_id == g.current_user.id)
            .filter(CheckResultDb.human_review_status.isnot(None))
            .group_by(CheckResultDb.human_review_status)
            .all()
        )
        review_counts = {str(status): int(count or 0) for status, count in review_rows}

        return jsonify({
            "metrics": {
                "total_documents": int(total_documents),
                "total_runs": int(total_runs),
                "average_score": float(average_score) if average_score is not None else 0.0,
                "flagged_outputs": int(review_counts.get("flag", 0)),
            },
            "agreement": {
                "agree": int(review_counts.get("agree", 0)),
                "disagree": int(review_counts.get("disagree", 0)),
                "flag": int(review_counts.get("flag", 0)),
            }
        }), 200
    except Exception as e:
        return jsonify(error=f"Failed to build agreement report: {str(e)}"), 500


@data_manager_bp.route('/reviews', methods=['GET'])
@require_auth
def list_human_reviews():
    """Returns human review entries for the current user."""
    try:
        status_filter = str(request.args.get('status', '') or '').strip().lower()

        query = (
            db.session.query(CheckResultDb, RunDb, DocumentDb)
            .join(RunDb, CheckResultDb.run_id == RunDb.id)
            .join(DocumentDb, RunDb.document_id == DocumentDb.id)
            .join(RunOwnerDb, RunOwnerDb.run_id == RunDb.id)
            .filter(RunOwnerDb.user_id == g.current_user.id)
            .filter(CheckResultDb.human_review_status.isnot(None))
        )

        if status_filter in {'agree', 'disagree', 'flag'}:
            query = query.filter(CheckResultDb.human_review_status == status_filter)

        rows = query.order_by(CheckResultDb.human_review_timestamp.desc()).all()

        items = []
        for check_row, run_row, doc_row in rows:
            items.append({
                'run_id': run_row.id,
                'document_id': doc_row.id,
                'document_name': doc_row.name,
                'check_id': check_row.check_id,
                'check_name': check_row.name,
                'status': check_row.human_review_status,
                'comments': check_row.human_review_comments,
                'timestamp': check_row.human_review_timestamp.isoformat() if check_row.human_review_timestamp else None,
                'judge_verdict': check_row.judge_verdict,
                'judge_score': check_row.judge_score,
            })

        return jsonify({'items': items}), 200
    except Exception as e:
        return jsonify(error=f"Failed to load reviews: {str(e)}"), 500

@data_manager_bp.route('/files/<file_id>/runs', methods=['GET'])
@require_auth
def get_document_runs(file_id):
    """Returns all runs for a specific document."""
    storage = StorageService()
    manager = RunManager(storage, LLMEngine(), EvaluatorService())
    
    doc = storage.get_document(file_id)
    if not doc:
        return jsonify(error="Document not found"), 404
        
    runs = manager.get_runs_for_document(file_id, user_id=g.current_user.id)
    return jsonify(runs), 200

@data_manager_bp.route('/files/<file_id>/detect-checks', methods=['POST'])
def detect_checks(file_id):
    """
    Analyzes a document's content and returns a list of relevant check IDs.
    """
    # 1. Get document text
    storage = StorageService()
    doc = storage.get_document(file_id)
    if not doc:
        return jsonify(error="Document not found"), 404
        
    paragraphs = storage.get_document_paragraphs(file_id)
    document_text = "\n\n".join(paragraphs)
    if not document_text.strip():
        return jsonify(error="Could not extract text from document"), 400

    try:
        checks_rows = FrameworkCheckDb.query.order_by(FrameworkCheckDb.check_id.asc()).all()
        available_checks = [
            {
                "id": row.check_id,
                "name": row.name,
                "prompt": row.prompt,
                "category": row.category,
                "few_shot": row.few_shot or "",
                "judge_override": row.judge_override or "",
            }
            for row in checks_rows
        ]
        if not available_checks:
            return jsonify(error="No checks available in database.framework_checks"), 400
                            
        # 3. Detect via LLM
        llm = LLMEngine()
        detection_result = llm.detect_relevant_checks_verbose(document_text, available_checks)

        selected_ids = detection_result.get("relevant_check_ids", [])
        return jsonify({
            "relevant_check_ids": selected_ids,
            "selected_count": len(selected_ids),
            "total_available_checks": len(available_checks),
            "detection_mode": detection_result.get("mode", "unknown"),
            "detection_reason": detection_result.get("reason", ""),
            "invalid_returned_ids": detection_result.get("invalid_ids", []),
        }), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify(error=f"Failed to detect checks: {str(e)}"), 500

@data_manager_bp.route('/files/<file_id>/content', methods=['GET'])
def get_file_content(file_id):
    """Returns the text content of a document split into paragraphs."""
    storage = StorageService()
    doc = storage.get_document(file_id)
    if not doc:
        return jsonify(error="Document not found"), 404
        
    paragraphs = storage.get_document_paragraphs(file_id)
    return jsonify({
        "document_name": doc.name,
        "paragraphs": paragraphs
    }), 200

@data_manager_bp.route('/files/<file_id>/download', methods=['GET'])
def download_file(file_id):
    """Downloads a document."""
    storage = StorageService()
    doc = storage.get_document(file_id)
    if not doc:
        return jsonify(error="Document not found"), 404
        
    payload = storage.get_document_bytes(file_id)
    if payload is None:
        return jsonify(error="Document payload not found"), 404

    content_type = storage.get_document_content_type(file_id) or "application/octet-stream"
    return send_file(
        io.BytesIO(payload),
        as_attachment=False,
        download_name=doc.name,
        mimetype=content_type,
    )

@data_manager_bp.route('/files/<file_id>', methods=['DELETE'])
@require_auth
def delete_file(file_id):
    """Deletes a document and its associated runs."""
    storage = StorageService()
    manager = RunManager(storage, LLMEngine(), EvaluatorService())
    
    doc = storage.get_document(file_id)
    if not doc:
        return jsonify(error="Document not found"), 404
        
    # Delete associated runs first
    manager.delete_runs_for_document(file_id, user_id=g.current_user.id)
    
    # Delete document from storage and db
    storage.delete_document(file_id)
    
    return jsonify({"message": "Document deleted successfully"}), 200
