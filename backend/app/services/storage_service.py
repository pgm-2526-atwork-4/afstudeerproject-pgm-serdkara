from app.models.domain import Document
from app.models.schema import DocumentDb
from app.models.db import db
from pathlib import Path
from flask import current_app
import os
import io
import uuid

class StorageService:
    """Handles local file storage and metadata tracking in the database."""
    
    def __init__(self, base_dir: Path = None):
        self.base_dir = base_dir
        
    def _get_base_dir(self):
        if self.base_dir: return self.base_dir
        return Path(current_app.config['DOCUMENTS_DIR'])

    def _sync_filesystem_to_db(self):
        """Ensures all physical files in the directory are tracked in the database."""
        base = self._get_base_dir()
        if not base.exists():
            return
            
        for root, _, filenames in os.walk(base):
            root_path = Path(root)
            for fname in filenames:
                fpath = root_path / fname
                if fpath.is_file():
                    existing_doc = DocumentDb.query.filter_by(name=fname).first()
                    if not existing_doc:
                        doc_id = str(uuid.uuid4())
                        doc_db = DocumentDb(
                            id=doc_id,
                            name=fname,
                            size=fpath.stat().st_size,
                            path=str(fpath)
                        )
                        db.session.add(doc_db)
        db.session.commit()

    def get_document(self, document_id: str) -> Document | None:
        """Retrieve document metadata by ID."""
        doc_db = db.session.get(DocumentDb, document_id)
        if doc_db:
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
        dest_path = self._get_base_dir() / secure_filename
        
        if dest_path.exists():
            self._sync_filesystem_to_db()
            existing_doc = DocumentDb.query.filter_by(name=dest_path.name).first()
            if existing_doc:
                return Document(
                    id=existing_doc.id,
                    name=existing_doc.name,
                    size=existing_doc.size,
                    path=existing_doc.path,
                    uploaded_at=existing_doc.uploaded_at
                )
            raise FileExistsError("File already exists")
            
        file_storage.save(str(dest_path))
        doc_id = str(uuid.uuid4())
        
        doc_db = DocumentDb(
            id=doc_id,
            name=dest_path.name,
            size=dest_path.stat().st_size,
            path=str(dest_path)
        )
        db.session.add(doc_db)
        db.session.commit()
        db.session.refresh(doc_db)
        
        return Document(
            id=doc_id,
            name=dest_path.name,
            size=dest_path.stat().st_size,
            path=str(dest_path),
            uploaded_at=doc_db.uploaded_at
        )
        
    def list_documents(self) -> list[Document]:
        self._sync_filesystem_to_db()
        docs = DocumentDb.query.order_by(DocumentDb.uploaded_at.desc()).all()
        return [Document(id=d.id, name=d.name, size=d.size, path=d.path, uploaded_at=d.uploaded_at) for d in docs]
        
    def delete_document(self, document_id: str) -> bool:
        """Deletes a document from the database and the physical file."""
        doc_db = db.session.get(DocumentDb, document_id)
        if not doc_db:
            return False
            
        file_path = Path(doc_db.path)
        
        # Delete from DB
        db.session.delete(doc_db)
        db.session.commit()
        
        # Delete physical file
        if file_path.exists():
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Failed to delete physical file {file_path}: {e}")
                
        return True
