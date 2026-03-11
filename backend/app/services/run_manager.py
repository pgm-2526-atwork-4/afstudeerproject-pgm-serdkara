from app.models.domain import RunRequest, RunResult, CheckResult, ExtractedEvidenceModel, JudgeAssessment, EvidenceType, CheckConstraint
from app.services.storage_service import StorageService
from app.services.llm_engine import LLMEngine
from app.services.evaluator import EvaluatorService
from datetime import datetime, UTC
import uuid
import json
import os
import re
from pathlib import Path
from app.models.db import db
from app.models.schema import RunDb, CheckResultDb
from app.utils.helpers import extract_document_paragraphs

class RunManager:
    """Manages the lifecycle of an analysis run."""
    
    def __init__(self, storage_service: StorageService, llm_engine: LLMEngine, evaluator: EvaluatorService):
        self.storage_service = storage_service
        self.llm_engine = llm_engine
        self.evaluator = evaluator
        # Share the LLM engine with the evaluator for judge calls
        self.evaluator.llm_engine = llm_engine
        
    def start_run(self, request: RunRequest, app=None) -> str:
        """
        Creates a run record immediately and kicks off background processing.
        Returns the run_id instantly so the frontend can navigate.
        """
        # 1. Fetch Document
        doc = self.storage_service.get_document(request.document_id)
        if not doc:
            raise ValueError(f"Document {request.document_id} not found.")
            
        # Create a human-readable run ID
        doc_stem = Path(doc.name).stem
        safe_name = re.sub(r'[^a-zA-Z0-9]', '_', doc_stem).strip('_').lower()
        if not safe_name:
            safe_name = "document"
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        run_id = f"run_{timestamp_str}_{safe_name}"
        
        # Extract real text from the uploaded document
        doc_path = Path(doc.path)
        paragraphs = extract_document_paragraphs(doc_path)
        if not paragraphs:
            raise ValueError(f"Could not extract text from document '{doc.name}'. Ensure it is a valid PDF, DOCX, or text file.")
        document_text = "\n\n".join(paragraphs)
        
        # Resolve evidence types
        ev_types = request.evidence_types
        if not ev_types:
            ev_types = [
                EvidenceType(value="TEST_9_1_1", name="Incident Response Plan Exists", instructions="Check if the organization maintains a formal, documented incident response plan."),
                EvidenceType(value="TEST_9_1_4", name="Incident Reporting", instructions="Check if there is a defined workflow for employees to report security incidents."),
                EvidenceType(value="TEST_9_1_3", name="Quarterly Incident Tabletop Exercises", instructions="Check if tabletop exercises are conducted at least once per quarter."),
                EvidenceType(value="TEST_10_1_1", name="MFA Enforced for All Users", instructions="Check if Multi-factor authentication (MFA) must be enforced for all administrative accounts and remote access connections.")
            ]
        
        # 2. Save initial "processing" run to DB immediately
        run_db = RunDb(
            id=run_id,
            document_id=request.document_id,
            timestamp=datetime.now(UTC),
            status="processing"
        )
        db.session.add(run_db)
        db.session.commit()
        
        # 3. Kick off background processing in a thread
        import threading
        thread = threading.Thread(
            target=self._process_run_background,
            args=(app, run_id, document_text, ev_types)
        )
        thread.daemon = True
        thread.start()
        
        return run_id

    def _process_run_background(self, app, run_id: str, document_text: str, ev_types: list):
        """Runs the LLM pipeline in a background thread, saving each check incrementally."""
        with app.app_context():
            try:
                for ev_type in ev_types:
                    check_id = ev_type.value.replace('TEST_', '').replace('_', '.')
                    
                    # Step A: Extract
                    extraction = self.llm_engine.extract_evidence(document_text, ev_type)
                    
                    # Step B: Evaluate (Judge)
                    constraint = CheckConstraint(
                        check_id=check_id,
                        name=ev_type.name,
                        prompt=ev_type.instructions
                    )
                    assessment = self.evaluator.evaluate_extraction(extraction, constraint, document_text)
                    
                    # Step C: Save check to DB immediately
                    cr_db = CheckResultDb(
                        run_id=run_id,
                        check_id=check_id,
                        name=ev_type.name,
                        instructions=ev_type.instructions,
                        extraction_value=extraction.value if extraction else None,
                        extraction_confidence=extraction.confidence if extraction else None,
                        judge_verdict=assessment.verdict if assessment else None,
                        judge_score=assessment.score if assessment else None,
                        judge_reasoning=assessment.reasoning if assessment else None,
                        judge_rubric=assessment.rubric_breakdown if assessment else None,
                    )
                    db.session.add(cr_db)
                    db.session.commit()
                
                # Mark run as complete
                run_db = db.session.get(RunDb, run_id)
                if run_db:
                    run_db.status = "complete"
                    db.session.commit()
                    
            except Exception as e:
                print(f"Background run error for {run_id}: {e}")
                run_db = db.session.get(RunDb, run_id)
                if run_db:
                    run_db.status = "error"
                    db.session.commit()

    def save_run_result(self, run_result: RunResult):
        """Persists the run state to the database."""
        # 1. Create RunDb record
        run_db = RunDb(
            id=run_result.run_id,
            document_id=run_result.document_id,
            timestamp=run_result.timestamp,
            status=run_result.status
        )
        db.session.add(run_db)
        
        # 2. Add CheckRecords
        for check in run_result.checks:
            cr_db = CheckResultDb(
                run_id=run_result.run_id,
                check_id=check.check_id,
                name=check.name,
                instructions=check.instructions,
                
                # Extraction
                extraction_value=check.extraction.value if check.extraction else None,
                extraction_confidence=check.extraction.confidence if check.extraction else None,
                
                # Judge
                judge_verdict=check.judge_assessment.verdict if check.judge_assessment else None,
                judge_score=check.judge_assessment.score if check.judge_assessment else None,
                judge_reasoning=check.judge_assessment.reasoning if check.judge_assessment else None,
                judge_rubric=check.judge_assessment.rubric_breakdown if check.judge_assessment else None,
            )
            db.session.add(cr_db)
            
        db.session.commit()
            
    def _run_to_dict(self, run_db: RunDb) -> dict:
        checks = []
        for c in run_db.checks:
            checks.append({
                "check_id": c.check_id,
                "name": c.name,
                "instructions": c.instructions,
                "extraction": {"value": c.extraction_value, "confidence": c.extraction_confidence} if c.extraction_value else None,
                "judge_assessment": {
                    "verdict": c.judge_verdict,
                    "score": c.judge_score,
                    "reasoning": c.judge_reasoning,
                    "rubric_breakdown": c.judge_rubric
                } if c.judge_verdict else None,
                "human_review": {
                    "status": c.human_review_status,
                    "comments": c.human_review_comments,
                    "timestamp": c.human_review_timestamp.isoformat() if c.human_review_timestamp else None
                } if c.human_review_status else None
            })
            
        return {
            "run_id": run_db.id,
            "document_id": run_db.document_id,
            "timestamp": run_db.timestamp.isoformat() if run_db.timestamp else None,
            "status": run_db.status,
            "checks": checks
        }

    def get_run_status(self, run_id: str) -> dict:
        """Retrieves a run result by ID."""
        run_db = db.session.get(RunDb, run_id)
        if not run_db:
            return None
        return self._run_to_dict(run_db)

    def re_extract(self, run_id: str, check_id: str) -> dict:
        """Stubs re-extraction of a specific check."""
        run_db = db.session.get(RunDb, run_id)
        if not run_db:
            raise ValueError(f"Run {run_id} not found.")
            
        for check in run_db.checks:
            if check.check_id == check_id:
                check.extraction_value = "Re-extracted value based on updated context..."
                break
                
        db.session.commit()
        return self._run_to_dict(run_db)

    def re_judge(self, run_id: str, check_id: str) -> dict:
        """Stubs re-evaluation of a specific check."""
        run_db = db.session.get(RunDb, run_id)
        if not run_db:
            raise ValueError(f"Run {run_id} not found.")
            
        for check in run_db.checks:
            if check.check_id == check_id:
                check.judge_reasoning = "Re-evaluated and adjusted score based on new extraction."
                check.judge_score = 4
                break
                
        db.session.commit()
        return self._run_to_dict(run_db)

    def get_runs_for_document(self, document_id: str) -> list[dict]:
        """Retrieves all runs for a specific document ID."""
        runs = RunDb.query.filter_by(document_id=document_id).order_by(RunDb.timestamp.desc()).all()
        return [self._run_to_dict(r) for r in runs]
        
    def delete_runs_for_document(self, document_id: str) -> None:
        """Deletes all runs related to a specific document ID."""
        runs = RunDb.query.filter_by(document_id=document_id).all()
        for r in runs:
            db.session.delete(r)
        db.session.commit()

    def submit_review(self, run_id: str, check_id: str, status: str, comments: str = "") -> dict:
        """Records a human review for a specific check."""
        run_db = db.session.get(RunDb, run_id)
        if not run_db:
            raise ValueError(f"Run {run_id} not found.")

        for check in run_db.checks:
            if check.check_id == check_id:
                check.human_review_status = status
                check.human_review_comments = comments
                check.human_review_timestamp = datetime.now(UTC)
                break
                
        db.session.commit()
        return self._run_to_dict(run_db)
