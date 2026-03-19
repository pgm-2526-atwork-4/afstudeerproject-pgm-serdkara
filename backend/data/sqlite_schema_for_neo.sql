-- Source: SQLite database `backend/data/validator.db`
-- Generated: 2026-03-18
-- Purpose: Table map + PostgreSQL-compatible schema for use in Neo SQL Editor

-- ============================================================
-- TABLE MAP (from current SQLite database)
-- ============================================================
-- 1) runs
--    - id (VARCHAR(200), PK)
--    - document_id (VARCHAR(50), NOT NULL)
--    - timestamp (DATETIME, NOT NULL)
--    - status (VARCHAR(20), NOT NULL)
--
-- 2) documents
--    - id (VARCHAR(50), PK)
--    - name (VARCHAR(200), NOT NULL)
--    - size (INTEGER, NOT NULL)
--    - path (VARCHAR(500), NOT NULL)
--    - content_type (VARCHAR(50), NULL)
--    - uploaded_at (DATETIME, NOT NULL)
--
-- 3) golden_set
--    - id (VARCHAR(50), PK)
--    - check_id (VARCHAR(50), NOT NULL)
--    - document_context (VARCHAR, NOT NULL)
--    - expected_outcome (VARCHAR(50), NOT NULL)
--    - expected_evidence (VARCHAR, NOT NULL)
--    - created_at (DATETIME, NOT NULL)
--
-- 4) check_results
--    - id (INTEGER, PK)
--    - run_id (VARCHAR(200), NOT NULL, FK -> runs.id)
--    - check_id (VARCHAR(50), NOT NULL)
--    - name (VARCHAR(200), NOT NULL)
--    - instructions (VARCHAR, NOT NULL)
--    - extraction_value (VARCHAR, NULL)
--    - extraction_confidence (FLOAT, NULL)
--    - judge_verdict (VARCHAR(20), NULL)
--    - judge_score (INTEGER, NULL)
--    - judge_reasoning (VARCHAR, NULL)
--    - judge_rubric (JSON, NULL)
--    - human_review_status (VARCHAR(20), NULL)
--    - human_review_comments (VARCHAR, NULL)
--    - human_review_timestamp (DATETIME, NULL)

-- ============================================================
-- POSTGRESQL-COMPATIBLE DDL FOR NEO SQL EDITOR
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    size INTEGER NOT NULL,
    path VARCHAR(500) NOT NULL,
    content_type VARCHAR(50),
    uploaded_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS golden_set (
    id VARCHAR(50) PRIMARY KEY,
    check_id VARCHAR(50) NOT NULL,
    document_context TEXT NOT NULL,
    expected_outcome VARCHAR(50) NOT NULL,
    expected_evidence TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
    id VARCHAR(200) PRIMARY KEY,
    document_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS check_results (
    id BIGSERIAL PRIMARY KEY,
    run_id VARCHAR(200) NOT NULL,
    check_id VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    instructions TEXT NOT NULL,
    extraction_value TEXT,
    extraction_confidence DOUBLE PRECISION,
    judge_verdict VARCHAR(20),
    judge_score INTEGER,
    judge_reasoning TEXT,
    judge_rubric JSONB,
    human_review_status VARCHAR(20),
    human_review_comments TEXT,
    human_review_timestamp TIMESTAMP,
    CONSTRAINT fk_check_results_run_id FOREIGN KEY (run_id) REFERENCES runs(id)
);

COMMIT;

-- Optional: verify result
-- SELECT table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;
