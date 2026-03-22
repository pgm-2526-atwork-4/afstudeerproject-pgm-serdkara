from app.models.domain import JudgeAssessment, ExtractedEvidenceModel, CheckConstraint

class EvaluatorService:
    """Handles the LLM judging of extracted evidence against rubrics."""
    
    def __init__(self, llm_engine=None):
        self.llm_engine = llm_engine
    
    def evaluate_extraction(self, extraction: ExtractedEvidenceModel, check: CheckConstraint, document_text: str = "") -> JudgeAssessment:
        """
        Evaluates the extracted evidence using the Judge LLM.
        Falls back to a basic heuristic if no LLM engine is available.
        """
        # If no LLM engine or no document text, use heuristic fallback
        if not self.llm_engine or not self.llm_engine.client or not document_text:
            return self._heuristic_evaluate(extraction, check)
        
        try:
            # Call the Judge LLM via evaluate_faithfulness
            claim = extraction.value if extraction.value else "No extraction available"
            result = self.llm_engine.evaluate_faithfulness(document_text, claim)
            
            verdict_raw = result.get("verdict", "FAIL").upper()
            classification = str(result.get("classification", "UNKNOWN") or "UNKNOWN").upper()
            reasoning = result.get("reasoning", "No reasoning provided by judge.")
            
            # Map verdict to pass/fail/flagged
            if verdict_raw == "PASS":
                verdict = "pass"
                base_score = 4
            elif classification in ("INFERENCE",):
                verdict = "flagged"
                base_score = 3
            else:
                verdict = "fail"
                base_score = 1
            
            # Adjust score based on extraction confidence
            confidence = extraction.confidence if extraction.confidence else 0.0
            if verdict == "pass" and confidence >= 0.9:
                base_score = 5
            elif verdict == "pass" and confidence >= 0.7:
                base_score = 4
            
            # Build rubric breakdown based on classification
            rubric = self._build_rubric(verdict, classification, confidence)
            
            return JudgeAssessment(
                check_id=check.check_id,
                verdict=verdict,
                score=base_score,
                reasoning=reasoning,
                rubric_breakdown=rubric
            )
            
        except Exception as e:
            return JudgeAssessment(
                check_id=check.check_id,
                verdict="fail",
                score=0,
                reasoning=f"Judge evaluation failed: {str(e)}",
                rubric_breakdown={"correctness": 0, "completeness": 0, "consistency": 0, "relevance": 0, "traceability": 0}
            )
    
    def _build_rubric(self, verdict: str, classification: str, confidence: float) -> dict:
        """Builds a rubric breakdown based on verdict and classification."""
        if verdict == "pass":
            return {
                "correctness": 5 if confidence >= 0.9 else 4,
                "completeness": 5 if confidence >= 0.9 else 4,
                "consistency": 5,
                "relevance": 5 if confidence >= 0.8 else 4,
                "traceability": 4
            }
        elif verdict == "flagged":
            return {
                "correctness": 3,
                "completeness": 3,
                "consistency": 4,
                "relevance": 3,
                "traceability": 3
            }
        else:
            score = 2 if classification == "INFERENCE" else 1
            return {
                "correctness": score,
                "completeness": score,
                "consistency": score + 1 if score < 5 else 5,
                "relevance": score,
                "traceability": score
            }
    
    def _heuristic_evaluate(self, extraction: ExtractedEvidenceModel, check: CheckConstraint) -> JudgeAssessment:
        """Basic fallback evaluation when LLM is unavailable."""
        confidence = extraction.confidence if extraction.confidence else 0.0
        has_value = bool(extraction.value and extraction.value != "Extraction failed")
        
        if has_value and confidence >= 0.7:
            verdict = "pass"
            score = 4 if confidence >= 0.85 else 3
        elif has_value:
            verdict = "flagged"
            score = 2
        else:
            verdict = "fail"
            score = 1
        
        return JudgeAssessment(
            check_id=check.check_id,
            verdict=verdict,
            score=score,
            reasoning=f"Heuristic evaluation (LLM unavailable). Confidence: {confidence:.0%}.",
            rubric_breakdown={"correctness": score, "completeness": score, "consistency": score, "relevance": score, "traceability": score}
        )
