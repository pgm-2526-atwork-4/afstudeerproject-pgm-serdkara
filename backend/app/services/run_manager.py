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

class RunManager:
    """Manages the lifecycle of an analysis run."""
    
    def __init__(self, storage_service: StorageService, llm_engine: LLMEngine, evaluator: EvaluatorService):
        self.storage_service = storage_service
        self.llm_engine = llm_engine
        self.evaluator = evaluator
        
    def start_run(self, request: RunRequest) -> RunResult:
        """
        Executes a run. Currently executes synchronously for simplicity,
        but designed to easily offload to Celery or RQ in the future.
        """
        # 1. Fetch Document
        doc = self.storage_service.get_document(request.document_id)
        if not doc:
            raise ValueError(f"Document {request.document_id} not found.")
            
        # Create a human-readable run ID (e.g., run_20251211_205214_incident_response)
        doc_stem = Path(doc.name).stem
        safe_name = re.sub(r'[^a-zA-Z0-9]', '_', doc_stem).strip('_').lower()
        if not safe_name:
            safe_name = "document"
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        run_id = f"run_{timestamp_str}_{safe_name}"
        
        # Optional: extract raw text here using a parser (skip for stub)
        document_text = f"Sample extracted text for {doc.name}"
        
        # 2. Initialize Result State
        run_result = RunResult(
            run_id=run_id,
            document_id=request.document_id,
            timestamp=datetime.now(UTC),
            status="running",
            checks=[]
        )
        
        # 3. Execute Pipeline for each EvidenceType
        for ev_type in request.evidence_types:
            check_id = ev_type.value.replace('TEST_', '').replace('_', '.')
            
            # Step A: Extract
            extraction = self.llm_engine.extract_evidence(document_text, ev_type)
            
            # Step B: Evaluate (Judge)
            constraint = CheckConstraint(
                check_id=check_id,
                name=ev_type.name,
                prompt=ev_type.instructions
            )
            assessment = self.evaluator.evaluate_extraction(extraction, constraint)
            
            # Step C: Record
            check_result = CheckResult(
                check_id=check_id,
                name=ev_type.name,
                instructions=ev_type.instructions,
                extraction=extraction,
                judge_assessment=assessment,
                human_review=None
            )
            run_result.checks.append(check_result)
            
        run_result.status = "complete"
        
        # 4. Save Run Result
        self.save_run_result(run_result)
        
        return run_result

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
