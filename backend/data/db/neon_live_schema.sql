-- Live Neon PostgreSQL schema export
-- Source of truth: current online Neon database
-- Generated for DrawSQL / Supabase SQL import

BEGIN;

-- Sequences
CREATE SEQUENCE IF NOT EXISTS "public"."benchmark_snapshots_id_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS "public"."check_results_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

-- Tables
CREATE TABLE IF NOT EXISTS "public"."app_config" (
  "key" character varying(120) NOT NULL,
  "value" character varying NOT NULL,
  "updated_at" timestamp without time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."benchmark_snapshots" (
  "id" integer DEFAULT nextval('benchmark_snapshots_id_seq'::regclass) NOT NULL,
  "timestamp" timestamp without time zone NOT NULL,
  "agreement_rate" double precision NOT NULL,
  "total" integer NOT NULL,
  "correct" integer NOT NULL,
  "mismatches" integer NOT NULL,
  "per_check" json NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."check_results" (
  "id" bigint DEFAULT nextval('check_results_id_seq'::regclass) NOT NULL,
  "run_id" character varying(200) NOT NULL,
  "check_id" character varying(50) NOT NULL,
  "name" character varying(200) NOT NULL,
  "instructions" text NOT NULL,
  "extraction_value" text,
  "extraction_confidence" double precision,
  "judge_verdict" character varying(20),
  "judge_score" integer,
  "judge_reasoning" text,
  "judge_rubric" jsonb,
  "human_review_status" character varying(20),
  "human_review_comments" text,
  "human_review_timestamp" timestamp without time zone
);

CREATE TABLE IF NOT EXISTS "public"."documents" (
  "id" character varying(50) NOT NULL,
  "name" character varying(200) NOT NULL,
  "size" integer NOT NULL,
  "path" character varying(500) NOT NULL,
  "content_type" character varying(50),
  "uploaded_at" timestamp without time zone NOT NULL,
  "content" bytea
);

CREATE TABLE IF NOT EXISTS "public"."framework_checks" (
  "check_id" character varying(80) NOT NULL,
  "name" character varying(255) NOT NULL,
  "prompt" text NOT NULL,
  "category" character varying(255) NOT NULL,
  "few_shot" text,
  "judge_override" text,
  "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."golden_set" (
  "id" character varying(50) NOT NULL,
  "check_id" character varying(50) NOT NULL,
  "document_context" text NOT NULL,
  "expected_outcome" character varying(50) NOT NULL,
  "expected_evidence" text NOT NULL,
  "created_at" timestamp without time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."run_owners" (
  "run_id" character varying(200) NOT NULL,
  "user_id" character varying(50) NOT NULL,
  "created_at" timestamp without time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."runs" (
  "id" character varying(200) NOT NULL,
  "document_id" character varying(50) NOT NULL,
  "timestamp" timestamp without time zone NOT NULL,
  "status" character varying(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."users" (
  "id" character varying(50) NOT NULL,
  "name" character varying(200) NOT NULL,
  "email" character varying(255) NOT NULL,
  "password_hash" character varying(255) NOT NULL,
  "is_approved" boolean NOT NULL,
  "approved_at" timestamp without time zone,
  "approved_by" character varying(255),
  "created_at" timestamp without time zone NOT NULL,
  "updated_at" timestamp without time zone NOT NULL
);

-- Sequence ownership
ALTER SEQUENCE "public"."benchmark_snapshots_id_seq" OWNED BY "public"."benchmark_snapshots"."id";
ALTER SEQUENCE "public"."check_results_id_seq" OWNED BY "public"."check_results"."id";

-- Constraints
ALTER TABLE ONLY "public"."app_config" ADD CONSTRAINT "app_config_pkey" PRIMARY KEY (key);
ALTER TABLE ONLY "public"."benchmark_snapshots" ADD CONSTRAINT "benchmark_snapshots_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."check_results" ADD CONSTRAINT "check_results_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."check_results" ADD CONSTRAINT "fk_check_results_run_id" FOREIGN KEY (run_id) REFERENCES runs(id);
ALTER TABLE ONLY "public"."documents" ADD CONSTRAINT "documents_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."framework_checks" ADD CONSTRAINT "framework_checks_pkey" PRIMARY KEY (check_id);
ALTER TABLE ONLY "public"."golden_set" ADD CONSTRAINT "golden_set_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."run_owners" ADD CONSTRAINT "run_owners_pkey" PRIMARY KEY (run_id);
ALTER TABLE ONLY "public"."run_owners" ADD CONSTRAINT "run_owners_run_id_fkey" FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE;
ALTER TABLE ONLY "public"."run_owners" ADD CONSTRAINT "run_owners_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE ONLY "public"."runs" ADD CONSTRAINT "runs_pkey" PRIMARY KEY (id);
ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY (id);

-- Additional indexes
CREATE INDEX ix_benchmark_snapshots_timestamp ON public.benchmark_snapshots USING btree ("timestamp");
CREATE INDEX ix_run_owners_user_id ON public.run_owners USING btree (user_id);
CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);

COMMIT;
