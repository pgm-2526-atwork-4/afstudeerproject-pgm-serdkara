import json
from pathlib import Path
from flask import current_app

def load_framework_index(json_path: Path) -> dict:
    """Index framework checks by ID for fast lookup."""
    index = {}
    if not json_path.exists():
        return index
        
    with open(json_path) as f:
        data = json.load(f)
        
    for domain_entry in data.get("Domains", []):
         for domain_data in domain_entry.values():
            for subdomain in domain_data.get("subdomains", []):
                for check in subdomain.get("checks", []):
                    for check_id, details in check.items():
                        index[check_id] = details
    return index

def secure_filename_preserve_ext(filename: str) -> str:
    """Use werkzeug's secure_filename to prevent dangerous names."""
    import werkzeug
    return werkzeug.utils.secure_filename(filename)

def extract_document_paragraphs(file_path: Path) -> list[str]:
    """Extracts text from a document and splits it into paragraphs."""
    ext = file_path.suffix.lower()
    text = ""
    try:
        if ext == '.pdf':
            import pypdf
            with open(file_path, "rb") as f:
                reader = pypdf.PdfReader(f)
                text = "\n\n".join(page.extract_text() for page in reader.pages if page.extract_text())
        elif ext == '.docx':
            import docx2txt
            text = docx2txt.process(file_path)
        else:
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
    except Exception as e:
        print(f"Error parsing document {file_path}: {e}")
        return []

    # Basic paragraph splitting
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    if not paragraphs:
        paragraphs = [p.strip() for p in text.split('\n') if p.strip()]
    
    return paragraphs
