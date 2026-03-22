# LLM Policy Validator

An **LLM-as-a-Judge** validation framework for cybersecurity policy documents. It uses Large Language Models to extract information from security policies (ISO 27001, NIST, internal policies) and then employs a separate Judge LLM to evaluate the quality, correctness, and faithfulness of those extractions — with full human-in-the-loop review capabilities.

---

## Why This Project Exists

LLM-generated interpretations of security policies can be incorrect, hallucinated, or inconsistent — a serious risk in compliance and audit contexts. This framework tackles that by:

1. **Extracting** actionable data from uploaded policy documents using a primary LLM.
2. **Judging** those extractions with a second LLM that scores faithfulness against the original text.
3. **Benchmarking** the judge's accuracy against a human-curated Ground Truth (Golden Set) to measure real-world reliability.

The end result is data-driven insight into *which model, prompt, and temperature combination* produces trustworthy policy interpretations.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js 16)                    │
│   Dashboard · Documents · Runs · Configuration · Reports        │
│   Authentication (Login / Register with admin approval)          │
└──────────────────────┬───────────────────────────────────────────┘
                       │  REST API (JSON)
┌──────────────────────▼───────────────────────────────────────────┐
│                         Backend (Flask)                           │
│   Routes:  auth · data_manager · validator · settings · golden_set│
│   Services: LLMEngine · RunManager · Evaluator · StorageService  │
│   Database: Neon / PostgreSQL (via SQLAlchemy)                   │
└──────────────────────┬───────────────────────────────────────────┘
                       │
          ┌────────────▼────────────┐
          │   OpenRouter API        │
          │   (OpenAI / Anthropic)  │
          └─────────────────────────┘
```

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4, Recharts, TypeScript |
| Backend | Flask 3, SQLAlchemy 2, Gunicorn |
| Database | Neon / PostgreSQL (required) |
| LLM Provider | OpenRouter (routes to OpenAI, Anthropic, etc.) |
| Auth | JWT (HS256) + admin approval via email (SMTP or Resend) |

---

## Key Features

### Document Management
- Upload PDF/DOCX security policy documents.
- Automatic text extraction and paragraph segmentation via `pypdf` and `docx2txt`.
- Download and delete documents through the UI.

### Analysis Runs
- Select specific checks from a configurable **Checks Library** (uploaded as JSON or managed via UI).
- **Auto-detect** relevant checks for a document using the LLM.
- Run analysis in the background — the LLM extracts evidence per check, then a Judge LLM evaluates faithfulness.
- View per-check results: extraction text, judge verdict (Pass/Fail), classification (SOUND / INFERENCE / HALLUCINATION / INCOHERENT), score, and reasoning.
- **Re-extract** or **Re-judge** individual checks without rerunning the entire analysis.

### Human-in-the-Loop Review
- **Agree**, **Disagree**, or **Flag** each judge verdict with optional comments.
- Review history accessible via a dedicated Reviews page.
- Agreement reports showing distribution of human feedback vs. judge decisions.

### Ground Truth & Benchmarking
- Maintain a **Golden Set** (ground truth baselines) with expected outcomes per check.
- Upload baselines in bulk (JSON) with flexible field-name aliases.
- Run benchmarks that compare LLM judge verdicts against the Golden Set and compute **agreement rate**.
- Benchmark history with per-check breakdowns, stored across runs.

### Configuration
- **Checks Library**: full CRUD for framework checks (id, name, prompt, category, few-shot examples, judge overrides).
- **LLM Settings**: choose extraction and judge models, tune temperature, max tokens, top_p.
- **Judge Prompt & Rubric**: edit the system prompt and evaluation rubric used by the judge, with a **live test** endpoint.
- **Runtime Source**: inspect active database connection and checks source.

### Authentication & Authorization
- User registration with email/password.
- Admin approval flow: super admin receives an approval link via email, user gets notified on approval.
- JWT-based API authentication on all protected routes.
- Configurable email delivery via SMTP or Resend.

---

## Project Structure

```
afstudeerproject-pgm-serdkara/
├── backend/               # Flask REST API (Python)
│   ├── app/
│   │   ├── models/        # SQLAlchemy models & domain DTOs
│   │   ├── routes/        # API blueprints (auth, data_manager, validator, settings, golden_set)
│   │   ├── services/      # Core logic (LLMEngine, RunManager, Evaluator, StorageService, Mailer)
│   │   └── utils/         # Helpers (document parsing, checks library flattening)
│   ├── config.py          # Centralized configuration
│   ├── run.py             # Application entry point
│   ├── gunicorn.conf.py   # Production server config
│   ├── requirements.txt   # Python dependencies
│   └── .env.example       # Environment variable template
├── frontend/              # Next.js web application (TypeScript)
│   ├── src/
│   │   ├── app/           # Next.js App Router pages
│   │   │   ├── (app)/     # Authenticated pages (dashboard, documents, runs, configuration, reports)
│   │   │   └── (auth)/    # Auth pages (login, register)
│   │   ├── components/    # Reusable React components (ui, layout)
│   │   ├── contexts/      # React contexts (AuthContext, DocumentCacheContext)
│   │   └── lib/           # API client & utilities
│   ├── package.json
│   └── .env.example       # Frontend env template
├── PROJECT_SPEC.md        # Original project specification (Dutch)
└── .env.local             # Root environment overrides (git-ignored)
```

---

## Quick Start

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** and npm
- A **PostgreSQL** database (e.g. [Neon](https://neon.tech/) free tier)
- An **OpenRouter API key** (for LLM access)

### 1. Clone the Repository

```bash
git clone https://github.com/pgm-2526-atwork-4/afstudeerproject-pgm-serdkara.git
cd afstudeerproject-pgm-serdkara
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv

# Activate the virtual env
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env` (or `.env.local`) from the template:

```bash
cp .env.example .env
```

Fill in at minimum:
- `DATABASE_URL` — your PostgreSQL connection string
- `OPENROUTER_API_KEY` — for LLM calls
- `JWT_SECRET` — a strong random secret for auth tokens

Start the server:

```bash
python run.py
```

The API will be available at `http://localhost:5000`. The database tables are created automatically on first startup.

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local` from the template:

```bash
cp .env.example .env.local
```

Set `NEXT_PUBLIC_API_BASE_URL` to point at your backend (default: `http://localhost:5000`).

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Production Deployment

| Component | Platform | Details |
|-----------|----------|---------|
| Backend | [Render](https://render.com) | Flask + Gunicorn, see `backend/README.md` |
| Frontend | [Vercel](https://vercel.com) | Next.js auto-detected, see `frontend/README.md` |
| Database | [Neon](https://neon.tech) | Managed PostgreSQL |

See the individual `backend/README.md` and `frontend/README.md` for full deployment instructions and environment variable reference.

---

## Environment Variables Reference

See the following `.env.example` files for the complete list:
- **Backend:** [`backend/.env.example`](backend/.env.example) — database, auth, CORS, email, LLM provider, and tuning settings.
- **Frontend:** [`frontend/.env.example`](frontend/.env.example) — API base URL for connecting to the backend.

---

## License

This project was developed as a graduation project (afstudeerproject) for the PGM program.
