import os
import json
from typing import List, Dict, Optional, Any
from app.models.domain import RunRequest, ExtractedEvidenceModel, EvidenceType
from openai import OpenAI

class LLMEngine:
    """Abstracts interaction with LLM providers (OpenAI, Claude)."""
    
    def __init__(self, provider="openai", model="gpt-4o-mini"):
        self.provider = provider
        
        # Support for OpenRouter via OpenAI SDK compatibility
        api_key = os.getenv("OPENROUTER_API_KEY") 
        base_url = "https://openrouter.ai/api/v1" if os.getenv("OPENROUTER_API_KEY") else None
        
        self.extraction_model = os.getenv("LLM_EXTRACTION_MODEL") or os.getenv("LLM_MODEL") or "openai/gpt-4o-mini"
        self.judge_model = os.getenv("LLM_JUDGE_MODEL") or os.getenv("LLM_MODEL") or "anthropic/claude-3.5-sonnet-20240620"
        
        # Just init the client if API key is present, else we'll mock or error gracefully.
        self.client = OpenAI(
            base_url=base_url,
            api_key=api_key
        ) if api_key else None
        
    def extract_evidence(self, document_text: str, evidence_type: EvidenceType) -> ExtractedEvidenceModel:
        """
        Uses the LLM to extract specific instructions from the text.
        """
        if not self.client:
            return ExtractedEvidenceModel(
                evidence_type_value=evidence_type.value,
                value=f"Mock extraction based on prompt: {evidence_type.instructions}",
                confidence=0.95,
                reasoning="API key missing, returning mock extraction from LLM engine."
            )

        prompt = f"""
        Extract the following information from the text:
        {evidence_type.name}: {evidence_type.instructions}
        
        TEXT:
        {document_text}
        
        Return your answer in JSON format with keys: "extracted_text" (string) and "confidence" (number between 0 and 1).
        """
        
        try:
            response = self.client.chat.completions.create(
                model=self.extraction_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                response_format={"type": "json_object"}
            )
            result = json.loads(response.choices[0].message.content)
            return ExtractedEvidenceModel(
                evidence_type_value=evidence_type.value,
                value=result.get("extracted_text", ""),
                confidence=float(result.get("confidence", 0.0)),
                reasoning="Extracted via OpenAI API"
            )
        except Exception as e:
            return ExtractedEvidenceModel(
                evidence_type_value=evidence_type.value,
                value="Extraction failed",
                confidence=0.0,
                reasoning=f"Error parsing LLM response: {str(e)}"
            )

    def extract_from_text(self, document_text: str, check_id: str) -> dict:
        """ Simplified extraction for benchmarking """
        if not self.client:
            return {"extracted_text": f"Mock claim for check {check_id} over {document_text[:10]}..."}
            
        prompt = f"""
        Extract the claim relevant to the check '{check_id}' from the following text.
        TEXT:
        {document_text}
        
        Return your answer in JSON format with key "extracted_text".
        """
        try:
            response = self.client.chat.completions.create(
                model=self.extraction_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception:
            return {"extracted_text": ""}

    def evaluate_faithfulness(self, document_text: str, claim: str) -> dict:
        """
        The Reference-Free Judge. 
        Enforces CoT and Temperature=0.0.
        """
        if not self.client:
            return {
                "verdict": "PASS",
                "classification": "SOUND",
                "reasoning": "Mock evaluation. API key not set."
            }
            
        system_prompt = """
        Je bent een meedogenloze auditor. Er is geen referentie-antwoord. 
        Jouw enige bron van waarheid is de BRONTEKST.

        Beoordeel de GEEXTRAHEERDE BEWERING (CLAIM) uitsluitend op basis van de BRONTEKST.
        
        Zet je output in JSON formaat met de volgende keys:
        - "reasoning_step_1": (string) Schrijf je deductie volledig uit (Chain-of-Thought). Detecteer actief 'partiële hallucinaties'. Is de bewering logisch of direct afgeleid van de bron?
        - "classification": (string) Kies exact uit: "SOUND", "INFERENCE", "HALLUCINATION", "INCOHERENT"
        - "verdict": (string) "PASS" als de classificatie SOUND of INFERENCE is. "FAIL" als het HALLUCINATION of INCOHERENT is.
        """
        
        user_prompt = f"BRONTEKST:\n{document_text}\n\nGEEXTRAHEERDE BEWERING (CLAIM):\n{claim}"
        
        try:
            response = self.client.chat.completions.create(
                model=self.judge_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.0,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return {
                "verdict": result.get("verdict", "FAIL"),
                "classification": result.get("classification", "UNKNOWN"),
                "reasoning": result.get("reasoning_step_1", "Geen beredenering")
            }
        except Exception as e:
            return {
                "verdict": "FAIL",
                "classification": "ERROR",
                "reasoning": f"Failed to parse judgement: {str(e)}"
            }
