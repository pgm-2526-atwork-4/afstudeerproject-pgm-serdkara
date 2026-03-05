from flask import Blueprint, jsonify, request, send_file
from app.services.storage_service import StorageService
from app.services.llm_engine import LLMEngine
from app.services.evaluator import EvaluatorService
from app.services.run_manager import RunManager
from app.utils.helpers import secure_filename_preserve_ext, extract_document_paragraphs
import werkzeug
import uuid
from pathlib import Path

data_manager_bp = Blueprint('data_manager', __name__)

@data_manager_bp.route('/files', methods=['GET'])
def list_files():
    """Returns a list of all uploaded documents."""
    storage = StorageService()
    manager = RunManager(storage, LLMEngine(), EvaluatorService())
    
    docs = storage.list_documents()
    res = []
    for doc in docs:
        doc_dump = doc.model_dump()
        runs = manager.get_runs_for_document(doc.id)
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

@data_manager_bp.route('/checks', methods=['GET'])
def list_checks():
    """Returns the library of available checks."""
    return jsonify([
        {"id": "9.1.1", "name": "Incident Response Plan Exists", "prompt": "Verify if an IR plan exists."}
    ]), 200

@data_manager_bp.route('/reports/agreement', methods=['GET'])
def get_agreement_report():
    """Returns agreement metrics for the dashboard."""
    return jsonify({
        "metrics": {"total_runs": 25, "average_score": 4.2},
        "agreement": {"agree": 65, "disagree": 20, "flag": 15}
    }), 200

@data_manager_bp.route('/files/<file_id>/content', methods=['GET'])
def get_file_content(file_id):
    """Returns the text content of a document split into paragraphs."""
    storage = StorageService()
    doc = storage.get_document(file_id)
    if not doc:
        return jsonify(error="Document not found"), 404
        
    paragraphs = extract_document_paragraphs(Path(doc.path))
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
        
    return send_file(doc.path, as_attachment=False)

@data_manager_bp.route('/files/<file_id>', methods=['DELETE'])
def delete_file(file_id):
    """Deletes a document and its associated runs."""
    storage = StorageService()
    manager = RunManager(storage, LLMEngine(), EvaluatorService())
    
    doc = storage.get_document(file_id)
    if not doc:
        return jsonify(error="Document not found"), 404
        
    # Delete associated runs first
    manager.delete_runs_for_document(file_id)
    
    # Delete document from storage and db
    storage.delete_document(file_id)
    
    return jsonify({"message": "Document deleted successfully"}), 200
