from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any
from datetime import datetime, UTC

class BaseModel:
    def model_dump(self):
        dump = asdict(self)
        for k, v in dump.items():
            if isinstance(v, datetime):
                dump[k] = v.isoformat()
        return dump

@dataclass
class Document(BaseModel):
    id: str
    name: str
    size: int
    path: str
    content_type: Optional[str] = None
    uploaded_at: Optional[datetime] = None

@dataclass
class CheckConstraint(BaseModel):
    check_id: str
    name: str
    prompt: str
    description: Optional[str] = None

@dataclass
class EvidenceType(BaseModel):
    value: str
    name: str
    instructions: str
    description: Optional[str] = None

@dataclass
class ExtractedEvidenceModel(BaseModel):
    evidence_type_value: str
    value: Any
    confidence: float
    source_spans: List[Dict] = field(default_factory=list)
    reasoning: Optional[str] = None

@dataclass
class JudgeAssessment(BaseModel):
    check_id: str
    verdict: str
    score: int
    reasoning: str
    rubric_breakdown: Dict[str, int] = field(default_factory=dict)

@dataclass
class HumanReview(BaseModel):
    check_id: str
    action: str
    override_score: Optional[int] = None
    comment: Optional[str] = None

@dataclass
class RunRequest(BaseModel):
    document_id: str
    evidence_types: List[EvidenceType] = field(default_factory=list)

@dataclass
class GoldenSetModel(BaseModel):
    id: str
    check_id: str
    document_context: str
    expected_outcome: str
    expected_evidence: str
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))

@dataclass
class CheckResult(BaseModel):
    check_id: str
    name: str
    instructions: str
    extraction: Optional[ExtractedEvidenceModel] = None
    judge_assessment: Optional[JudgeAssessment] = None
    human_review: Optional[HumanReview] = None

@dataclass
class RunResult(BaseModel):
    run_id: str
    document_id: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))
    status: str = "processing"
    checks: List[CheckResult] = field(default_factory=list)
