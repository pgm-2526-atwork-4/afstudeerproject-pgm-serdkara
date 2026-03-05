from typing import List
from app.models.domain import RunRequest, ExtractedEvidenceModel, EvidenceType

class LLMEngine:
    """Abstracts interaction with LLM providers (OpenAI, Claude)."""
    
    def __init__(self, provider="openai", model="gpt-4o-mini"):
        self.provider = provider
        self.model = model
        
    def extract_evidence(self, document_text: str, evidence_type: EvidenceType) -> ExtractedEvidenceModel:
        """
        Uses the LLM to extract specific instructions from the text.
        """
        # Stub for deterministic mock implementation
        return ExtractedEvidenceModel(
            evidence_type_value=evidence_type.value,
            value="Mock extracted value based on prompt: " + evidence_type.instructions,
            confidence=0.95,
            reasoning="Mock reasoning from LLM engine."
        )
