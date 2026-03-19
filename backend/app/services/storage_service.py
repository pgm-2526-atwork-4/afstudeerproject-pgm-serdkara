from app.models.domain import Document
from app.models.schema import DocumentDb
from app.models.db import db
from pathlib import Path
from flask import current_app
import uuid

from app.utils.helpers import extract_document_paragraphs_from_blob

class StorageService:
    """Handles document storage and metadata tracking in the database."""
    
    def __init__(self, base_dir: Path = None):
        self.base_dir = base_dir
        
    def _get_base_dir(self):
        if self.base_dir: return self.base_dir
        return Path(current_app.config['DOCUMENTS_DIR'])

    def _hydrate_legacy_content(self, doc_db: DocumentDb) -> None:
        """Backfill document content from legacy file-path records into DB blob storage."""
        if doc_db.content:
            return
        if not doc_db.path:
            return

        legacy_path = Path(doc_db.path)
        if not legacy_path.is_absolute():
            return
        if not legacy_path.exists() or not legacy_path.is_file():
            return

        try:
            payload = legacy_path.read_bytes()
            doc_db.content = payload
            doc_db.size = len(payload)
            db.session.commit()
        except Exception:
            db.session.rollback()

    def get_document(self, document_id: str) -> Document | None:
        """Retrieve document metadata by ID."""
        doc_db = db.session.get(DocumentDb, document_id)
        if doc_db:
            self._hydrate_legacy_content(doc_db)
            return Document(
                id=doc_db.id,
                name=doc_db.name,
                size=doc_db.size,
                path=doc_db.path,
                uploaded_at=doc_db.uploaded_at
            )
        return None
        
    def save_document(self, file_storage, secure_filename: str) -> Document:
        """Save an uploaded file and return Document metadata."""
        existing_doc = DocumentDb.query.filter_by(name=secure_filename).first()
        if existing_doc:
            return Document(
                id=existing_doc.id,
                name=existing_doc.name,
                size=existing_doc.size,
                path=existing_doc.path,
                uploaded_at=existing_doc.uploaded_at
            )

        payload = file_storage.read()
        if payload is None:
            payload = b""

        doc_id = str(uuid.uuid4())
        path_marker = f"db://documents/{doc_id}/{secure_filename}"

        doc_db = DocumentDb(
            id=doc_id,
            name=secure_filename,
            size=len(payload),
            path=path_marker,
            content=payload,
            content_type=getattr(file_storage, "mimetype", None)
        )
        db.session.add(doc_db)
        db.session.commit()
        db.session.refresh(doc_db)

        return Document(
            id=doc_id,
            name=secure_filename,
            size=len(payload),
            path=path_marker,
            uploaded_at=doc_db.uploaded_at
        )

    def get_document_bytes(self, document_id: str) -> bytes | None:
        doc_db = db.session.get(DocumentDb, document_id)
        if not doc_db:
            return None
        self._hydrate_legacy_content(doc_db)
        return doc_db.content

    def get_document_paragraphs(self, document_id: str) -> list[str]:
        doc_db = db.session.get(DocumentDb, document_id)
        if not doc_db:
            return []
        self._hydrate_legacy_content(doc_db)
        return extract_document_paragraphs_from_blob(doc_db.name, doc_db.content)

    def get_document_content_type(self, document_id: str) -> str | None:
        doc_db = db.session.get(DocumentDb, document_id)
        if not doc_db:
            return None
        return doc_db.content_type
        
    def list_documents(self) -> list[Document]:
        docs = DocumentDb.query.order_by(DocumentDb.uploaded_at.desc()).all()
        return [Document(id=d.id, name=d.name, size=d.size, path=d.path, uploaded_at=d.uploaded_at) for d in docs]
        
    def delete_document(self, document_id: str) -> bool:
        """Deletes a document from the database."""
        doc_db = db.session.get(DocumentDb, document_id)
        if not doc_db:
            return False

        db.session.delete(doc_db)
        db.session.commit()

        return True
