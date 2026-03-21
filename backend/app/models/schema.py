from datetime import datetime, UTC
from typing import List, Optional
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, JSON, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.db import db

class DocumentDb(db.Model):
    __tablename__ = 'documents'
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    path: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[Optional[bytes]] = mapped_column(LargeBinary)
    content_type: Mapped[Optional[str]] = mapped_column(String(50))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))


class UserDb(db.Model):
    __tablename__ = 'users'

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_approved: Mapped[bool] = mapped_column(nullable=False, default=False)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    approved_by: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

class GoldenSetDb(db.Model):
    __tablename__ = 'golden_set'
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    check_id: Mapped[str] = mapped_column(String(50), nullable=False)
    document_context: Mapped[str] = mapped_column(String, nullable=False)
    expected_outcome: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. "Pass" or "Fail"
    expected_evidence: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))

class RunDb(db.Model):
    __tablename__ = 'runs'
    id: Mapped[str] = mapped_column(String(200), primary_key=True)
    document_id: Mapped[str] = mapped_column(String(50), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    status: Mapped[str] = mapped_column(String(20), default="processing")
    
    checks: Mapped[List["CheckResultDb"]] = relationship(back_populates="run", cascade="all, delete-orphan")


class RunOwnerDb(db.Model):
    __tablename__ = 'run_owners'

    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))

class CheckResultDb(db.Model):
    __tablename__ = 'check_results'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), nullable=False)
    check_id: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. "9.1.1"
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    instructions: Mapped[str] = mapped_column(String, nullable=False)
    
    # Extraction
    extraction_value: Mapped[Optional[str]] = mapped_column(String)
    extraction_confidence: Mapped[Optional[float]] = mapped_column(Float)
    
    # Judge Assessment
    judge_verdict: Mapped[Optional[str]] = mapped_column(String(20))
    judge_score: Mapped[Optional[int]] = mapped_column(Integer)
    judge_reasoning: Mapped[Optional[str]] = mapped_column(String)
    judge_rubric: Mapped[Optional[dict]] = mapped_column(JSON)
    
    # Human Review
    human_review_status: Mapped[Optional[str]] = mapped_column(String(20)) # agree, disagree, flag
    human_review_comments: Mapped[Optional[str]] = mapped_column(String)
    human_review_timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    run: Mapped["RunDb"] = relationship(back_populates="checks")


class FrameworkCheckDb(db.Model):
    __tablename__ = 'framework_checks'

    check_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    prompt: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String(255), nullable=False)
    few_shot: Mapped[Optional[str]] = mapped_column(String)
    judge_override: Mapped[Optional[str]] = mapped_column(String)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))


class BenchmarkSnapshotDb(db.Model):
    __tablename__ = 'benchmark_snapshots'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC), index=True)
    agreement_rate: Mapped[float] = mapped_column(Float, nullable=False)
    total: Mapped[int] = mapped_column(Integer, nullable=False)
    correct: Mapped[int] = mapped_column(Integer, nullable=False)
    mismatches: Mapped[int] = mapped_column(Integer, nullable=False)
    per_check: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
