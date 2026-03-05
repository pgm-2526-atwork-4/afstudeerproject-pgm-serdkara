from datetime import datetime, UTC
from typing import List, Optional
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.db import db

class DocumentDb(db.Model):
    __tablename__ = 'documents'
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    path: Mapped[str] = mapped_column(String(500), nullable=False)
    content_type: Mapped[Optional[str]] = mapped_column(String(50))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))

class RunDb(db.Model):
    __tablename__ = 'runs'
    id: Mapped[str] = mapped_column(String(200), primary_key=True)
    document_id: Mapped[str] = mapped_column(String(50), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    status: Mapped[str] = mapped_column(String(20), default="processing")
    
    checks: Mapped[List["CheckResultDb"]] = relationship(back_populates="run", cascade="all, delete-orphan")

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
