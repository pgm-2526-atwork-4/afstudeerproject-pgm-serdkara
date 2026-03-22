# LLM Policy Validator — Backend API

The Python Flask backend that powers the LLM Policy Validator. It exposes a REST API for uploading policy documents, running LLM-based extractions and evaluations, managing a checks library, maintaining ground truth baselines, and handling human-in-the-loop reviews.

## Architecture

| Concern | Technology |
|---------|-----------|
| Framework | Flask 3.0 (Python 3.10+) |
| Database | Neon / PostgreSQL (required, via SQLAlchemy 2) |
| LLM Provider | OpenRouter (routes to OpenAI, Anthropic, etc.) |
| Auth | JWT (HS256) + admin approval via email |
| Email | SMTP or Resend (configurable) |
| Production server | Gunicorn (gthread worker) |

## Directory Structure

```
backend/
├── app/
│   ├── __init__.py            # App factory (create_app), CORS, blueprint registration
│   ├── models/
│   │   ├── db.py              # SQLAlchemy instance
│   │   ├── domain.py          # Dataclass DTOs (RunRequest, CheckResult, etc.)
│   │   └── schema.py          # SQLAlchemy ORM models (9 tables)
│   ├── routes/
│   │   ├── auth.py            # /api/auth — register, login, approve, me
│   │   ├── data_manager.py    # /api — documents, checks CRUD, agreement reports, reviews
│   │   ├── validator.py       # /api — analyze, runs, re-extract, re-judge, human reviews
│   │   ├── settings.py        # /api/config — LLM settings, runtime source, judge test
│   │   └── golden_set.py      # /api/golden-set — ground truth baselines & benchmarking
│   ├── services/
│   │   ├── llm_engine.py      # OpenRouter integration, extraction & evaluation logic
│   │   ├── run_manager.py     # Orchestrates analysis runs (background thread)
│   │   ├── evaluator.py       # Judge faithfulness evaluation service
│   │   ├── storage_service.py # Document CRUD via database
│   │   └── mailer.py          # SMTP / Resend email delivery
│   └── utils/
│       ├── helpers.py         # Filename sanitization, document text extraction
│       └── checks_library.py  # JSON checks flattening, summary, structure analysis
├── config.py                  # Centralized config (DB, auth, mail, CORS, LLM)
├── run.py                     # Entry point (python run.py)
├── gunicorn.conf.py           # Gunicorn production settings
├── requirements.txt           # Python dependencies
├── .env.example               # Full environment variable reference
└── data/                      # Auto-created local data directory
```

## Database Models

| Model | Table | Purpose |
|-------|-------|---------|
| `DocumentDb` | `documents` | Uploaded policy documents (with binary payload) |
| `UserDb` | `users` | User accounts with approval status |
| `RunDb` | `runs` | Analysis run metadata (status, timestamp) |
| `RunOwnerDb` | `run_owners` | Links runs to users (multi-tenant) |
| `CheckResultDb` | `check_results` | Per-check extraction + judge + review data |
| `FrameworkCheckDb` | `framework_checks` | Configurable checks library |
| `GoldenSetDb` | `golden_set` | Ground truth baseline entries |
| `BenchmarkSnapshotDb` | `benchmark_snapshots` | Benchmark history (agreement rates) |
| `AppConfigDb` | `app_config` | Runtime-persisted key-value config |

## Setup & Installation

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
```

### 2. Activate the Environment

**Windows:**
```bash
.\venv\Scripts\activate
```

**Mac/Linux:**
```bash
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Environment Variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

**Required variables:**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (e.g. Neon) |
| `OPENROUTER_API_KEY` | API key for LLM access via OpenRouter |
| `JWT_SECRET` | Strong random secret for JWT token signing |

See [`.env.example`](.env.example) for the complete reference including CORS, email, LLM model, and tuning settings.

## Running the Server

Start the development server on port 5000:

```bash
python run.py
```

Database tables are created automatically on first startup. The frontend expects this API at `http://localhost:5000`.

## Production Deployment (Render)

Create a new **Web Service** on [Render](https://render.com) using the `backend/` directory.

| Setting | Value |
|---------|-------|
| Runtime | Python 3 |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `gunicorn -c gunicorn.conf.py run:app` |
| Root Directory | `backend` |

### Required Environment Variables on Render

| Variable | Recommended Value |
|----------|------------------|
| `DATABASE_URL` | Managed PostgreSQL / Neon connection string |
| `JWT_SECRET` | Long random secret |
| `SUPER_ADMIN_EMAIL` | Admin email for approval flow |
| `BACKEND_PUBLIC_URL` | Your Render backend URL |
| `FRONTEND_LOGIN_URL` | Your Vercel frontend login URL |
| `CORS_ALLOWED_ORIGINS` | Comma-separated, include Vercel domain(s) |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `MAIL_PROVIDER` | `smtp` or `resend` |

Gunicorn tuning (recommended for small instances):

| Variable | Recommended |
|----------|-------------|
| `WEB_CONCURRENCY` | `1` |
| `GUNICORN_THREADS` | `2` |
| `GUNICORN_TIMEOUT` | `90` |
| `GUNICORN_MAX_REQUESTS` | `0` |

Database pool tuning:

| Variable | Recommended |
|----------|-------------|
| `DB_POOL_SIZE` | `3` |
| `DB_MAX_OVERFLOW` | `1` |
| `DB_POOL_RECYCLE_SECONDS` | `180` |
| `DB_POOL_TIMEOUT_SECONDS` | `10` |
| `DB_CONNECT_TIMEOUT_SECONDS` | `5` |

Health check endpoint: `GET /health`

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user (requires admin approval) |
| `POST` | `/api/auth/login` | Log in and receive a JWT token |
| `GET` | `/api/auth/approve?token=...` | Approve a user (admin link from email) |
| `GET` | `/api/auth/me` | Get current authenticated user info |

### Documents (`/api`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/files` | List all uploaded documents with latest run status |
| `POST` | `/api/upload` | Upload a PDF/DOCX document |
| `GET` | `/api/files/<id>/content` | Get parsed text paragraphs |
| `GET` | `/api/files/<id>/download` | Download original document |
| `GET` | `/api/files/<id>/runs` | List all runs for a document |
| `POST` | `/api/files/<id>/detect-checks` | Auto-detect relevant checks via LLM |
| `DELETE` | `/api/files/<id>` | Delete document and associated runs |

### Checks Library (`/api`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/checks` | List all framework checks with usage stats |
| `POST` | `/api/checks` | Create a single check |
| `PUT` | `/api/checks/<check_id>` | Update an existing check |
| `DELETE` | `/api/checks/<check_id>` | Delete a check |
| `POST` | `/api/checks/upload` | Bulk upload checks from JSON |

### Analysis & Runs (`/api`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze` | Start a new analysis run (returns immediately, processes in background) |
| `GET` | `/api/runs/<run_id>` | Get status and results of a run |
| `POST` | `/api/runs/<run_id>/re-extract` | Re-extract a specific check |
| `POST` | `/api/runs/<run_id>/re-judge` | Re-judge a specific check |

### Human Reviews (`/api`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/reviews` | Submit a review (agree/disagree/flag) for a check result |
| `GET` | `/api/reviews` | List review history with optional status filter |
| `GET` | `/api/reports/agreement` | Get agreement metrics for the dashboard |

### Configuration (`/api/config`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/config/llm` | Get current LLM configuration |
| `POST` | `/api/config/llm` | Update LLM model, temperature, prompts, rubric |
| `POST` | `/api/config/llm/test-judge` | Test judge rubric on sample text |
| `GET` | `/api/config/runtime-source` | Show active DB target and checks source |

### Golden Set & Benchmarking (`/api/golden-set`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/golden-set` | List all ground truth baseline entries |
| `POST` | `/api/golden-set` | Add a single baseline entry |
| `POST` | `/api/golden-set/bulk` | Bulk upload baseline entries |
| `DELETE` | `/api/golden-set/<id>` | Delete a baseline entry |
| `POST` | `/api/golden-set/benchmark` | Run benchmark against the Golden Set |
| `GET` | `/api/golden-set/benchmark/latest` | Get the latest benchmark snapshot |
| `GET` | `/api/golden-set/benchmark/history` | Get benchmark history (compact) |
