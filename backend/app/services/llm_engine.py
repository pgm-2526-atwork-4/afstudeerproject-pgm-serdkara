import os
import json
from typing import List, Dict, Optional, Any
import re
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
        
        self.extraction_temperature = float(os.getenv("LLM_EXTRACTION_TEMPERATURE", "0.3"))
        self.extraction_max_tokens = int(os.getenv("LLM_EXTRACTION_MAX_TOKENS", "2000"))
        self.extraction_top_p = float(os.getenv("LLM_EXTRACTION_TOP_P", "0.9"))
        
        self.judge_max_tokens = int(os.getenv("LLM_JUDGE_MAX_TOKENS", "1000"))
        self.judge_top_p = float(os.getenv("LLM_JUDGE_TOP_P", "0.95"))
        self.request_timeout_seconds = float(os.getenv("LLM_REQUEST_TIMEOUT_SECONDS", "40"))
        
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
                temperature=self.extraction_temperature,
                max_tokens=self.extraction_max_tokens,
                top_p=self.extraction_top_p,
                response_format={"type": "json_object"},
                timeout=self.request_timeout_seconds,
            )
            result = json.loads(response.choices[0].message.content)
            extracted_raw = result.get("extracted_text", "")
            if isinstance(extracted_raw, (dict, list)):
                extracted_text = json.dumps(extracted_raw, ensure_ascii=False)
            elif extracted_raw is None:
                extracted_text = ""
            else:
                extracted_text = str(extracted_raw)
            return ExtractedEvidenceModel(
                evidence_type_value=evidence_type.value,
                value=extracted_text,
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
                temperature=self.extraction_temperature,
                max_tokens=self.extraction_max_tokens,
                top_p=self.extraction_top_p,
                response_format={"type": "json_object"},
                timeout=self.request_timeout_seconds,
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
                temperature=0.0, # Judge must always be deterministic
                max_tokens=self.judge_max_tokens,
                top_p=self.judge_top_p,
                response_format={"type": "json_object"},
                timeout=self.request_timeout_seconds,
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

    def evaluate_faithfulness_custom(
        self,
        document_text: str,
        claim: str,
        system_prompt_override: str | None = None,
        model_override: str | None = None,
    ) -> dict:
        """Customizable judge evaluation used by the Judge rubric test UI."""
        if not self.client:
            return {
                "verdict": "PASS",
                "classification": "SOUND",
                "reasoning": "Mock evaluation. API key not set."
            }

        default_system_prompt = """
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
                model=model_override or self.judge_model,
                messages=[
                    {"role": "system", "content": system_prompt_override or default_system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.0,
                max_tokens=self.judge_max_tokens,
                top_p=self.judge_top_p,
                response_format={"type": "json_object"},
                timeout=self.request_timeout_seconds,
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

    def detect_relevant_checks(self, document_text: str, available_checks: list[dict]) -> list[str]:
        """Backwards-compatible helper returning only check IDs."""
        result = self.detect_relevant_checks_verbose(document_text, available_checks)
        return result.get("relevant_check_ids", [])

    def detect_relevant_checks_verbose(self, document_text: str, available_checks: list[dict]) -> dict:
        """
        Detects relevant checks and returns diagnostics for traceability.
        Returns:
        {
            "relevant_check_ids": list[str],
            "mode": "llm" | "heuristic_no_api_key" | "heuristic_on_error",
            "reason": str,
            "invalid_ids": list[str]
        }
        """
        if not available_checks:
            return {
                "relevant_check_ids": [],
                "mode": "llm",
                "reason": "No available checks provided.",
                "invalid_ids": [],
            }

        allowed_ids = {str(c.get("id")) for c in available_checks if c.get("id") is not None}

        if not self.client:
            heuristic_ids = self._heuristic_detect_relevant_checks(document_text, available_checks)
            return {
                "relevant_check_ids": heuristic_ids,
                "mode": "heuristic_no_api_key",
                "reason": "No OpenRouter API key configured. Used lexical heuristic fallback.",
                "invalid_ids": [],
            }

        # Truncate text to avoid massive token usage for classification,
        # usually the first few pages are enough to determine the document type/scope.
        truncated_text = document_text[:6000]

        checks_summary = "\n".join(
            [f"- ID: {c.get('id')} | Name: {c.get('name')} | Category: {c.get('category', '')}" 
             for c in available_checks]
        )

        prompt = f"""
        Analyze the following policy document extract. Your task is to determine which of the provided compliance or security checks are covered by or relevant to this document's scope.
        
        DOCUMENT TEXT EXTRACT:
        ---
        {truncated_text}
        ---

        AVAILABLE CHECKS:
        {checks_summary}
        
        Return a JSON object with:
        - "relevant_check_ids": array of exact check IDs (e.g. "9.1.1") that are relevant.
        - "notes": short explanation of why those checks were selected.
        Return empty array if none apply.
        """
        
        try:
            response = self.client.chat.completions.create(
                model=self.extraction_model,
                messages=[
                    {"role": "system", "content": "You are a senior compliance auditor."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,  # Low temperature for classification consistency
                max_tokens=self.extraction_max_tokens,
                top_p=self.extraction_top_p,
                response_format={"type": "json_object"},
                timeout=self.request_timeout_seconds,
            )
            
            result = json.loads(response.choices[0].message.content)
            raw_ids = [str(cid) for cid in result.get("relevant_check_ids", [])]
            valid_ids = [cid for cid in raw_ids if cid in allowed_ids]
            invalid_ids = [cid for cid in raw_ids if cid not in allowed_ids]
            notes = str(result.get("notes", "")).strip()

            return {
                "relevant_check_ids": valid_ids,
                "mode": "llm",
                "reason": notes,
                "invalid_ids": invalid_ids,
            }
        except Exception as e:
            print(f"Failed to detect relevant checks: {str(e)}")
            heuristic_ids = self._heuristic_detect_relevant_checks(document_text, available_checks)
            return {
                "relevant_check_ids": heuristic_ids,
                "mode": "heuristic_on_error",
                "reason": f"LLM detect failed; used lexical heuristic fallback. Error: {str(e)}",
                "invalid_ids": [],
            }

    def _heuristic_detect_relevant_checks(self, document_text: str, available_checks: list[dict]) -> list[str]:
        """Simple lexical fallback to avoid degenerate all-or-none behavior."""
        text = (document_text or "").lower()
        tokens = set(re.findall(r"[a-z0-9]{3,}", text))
        if not tokens:
            return []

        scored: list[tuple[float, str]] = []
        for chk in available_checks:
            chk_id = str(chk.get("id", "")).strip()
            if not chk_id:
                continue

            keyword_source = f"{chk.get('name', '')} {chk.get('category', '')}"
            keywords = {w for w in re.findall(r"[a-z0-9]{3,}", keyword_source.lower()) if w not in {
                "the", "and", "for", "with", "from", "that", "this", "are", "not", "all", "use"
            }}

            if not keywords:
                continue

            overlap = len(tokens.intersection(keywords))
            score = overlap / max(len(keywords), 1)
            if overlap > 0:
                scored.append((score, chk_id))

        if not scored:
            return []

        scored.sort(key=lambda x: x[0], reverse=True)
        # Keep materially matched checks only.
        selected = [cid for score, cid in scored if score >= 0.12]

        # Guardrail: if threshold is too strict, keep top-3 non-zero matches.
        if not selected:
            selected = [cid for _, cid in scored[:3]]

        return selected
