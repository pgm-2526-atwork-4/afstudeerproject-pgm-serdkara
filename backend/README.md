# LLM Policy Validator - Backend API

This directory contains the Python Flask backend for the LLM Policy Validator tool. It provides a REST API to upload policy documents, trigger automated LLM-based extractions and evaluations against security frameworks (like ISO 27001), and manage human-in-the-loop reviews.

## Architecture

* **Framework:** Flask (Python 3.10+)
* **Database:** Neon/PostgreSQL-first (via SQLAlchemy) with SQLite fallback (`data/db/validator.db`) when configured.
* **Storage:** Database-backed for checks, runs, baselines, and policy document payloads.
* **LLM Engine:** Configurable via environment variables (OpenAI/Anthropic).

## Directory Structure

* `app/`: Main application package.
  * `models/`: SQLAlchemy database models and generic Data Transfer Objects (DTOs).
  * `routes/`: Flask Blueprints (`/api/files`, `/api/analyze`, etc.).
  * `services/`: Core logic (`RunManager`, `StorageService`, `LLMEngine`, `EvaluatorService`).
  * `utils/`: Helper functions (e.g., document parsing via `pypdf`/`docx2txt`).
* `data/`: Local storage for the SQLite database and uploaded files.
* `config.py`: Centralized configuration management.
* `run.py`: Application entry point.
* `requirements.txt`: Python package dependencies.


## Setup & Installation

1. **Environment Initialization**
   Create a virtual environment to isolate dependencies:
   ```bash
   python -m venv venv
   ```

2. **Activate the Environment**
   * **Windows:**
     ```bash
     .\venv\Scripts\activate
     ```
   * **Mac/Linux:**
     ```bash
     source venv/bin/activate
     ```

3. **Install Dependencies**
   Install the required HTTP libraries, SQLAlchemy, and document parsers:
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables**
   Create a `.env` file in this backend directory and configure your LLM provider keys:
   ```env
   OPENAI_API_KEY="your-sk-api-key"
   ANTHROPIC_API_KEY="your-sk-api-key"
   ```

## Running the Server

Start the Flask development server on port 5000:
```bash
python run.py
```

The SQLite fallback database (`data/db/validator.db`) and necessary `data/` directories will automatically be created on the first run. The frontend Next.js application expects this API to be running at `http://localhost:5000`.

## Production Deployment (Render + Vercel)

This project is typically deployed with:
- Backend on Render (Flask + Gunicorn)
- Frontend on Vercel (Next.js)

Deploy backend first, then point frontend to that backend URL.

### 1. Backend on Render

Create a new **Web Service** on Render using this `backend/` directory.

- **Runtime:** Python 3
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn --bind 0.0.0.0:$PORT run:app`
- **Root Directory:** `backend` (if repository root contains both frontend and backend)

Set environment variables in Render (never commit secrets):

- `DATABASE_URL` (recommended: managed PostgreSQL/Neon)
- `JWT_SECRET`
- `SUPER_ADMIN_EMAIL`
- `BACKEND_PUBLIC_URL` (your Render backend URL)
- `FRONTEND_LOGIN_URL` (your Vercel login page URL)
- `CORS_ALLOWED_ORIGINS` (comma-separated, include your Vercel domain(s))
- `OPENROUTER_API_KEY` and related `LLM_*` settings
- Email provider vars:
   - `MAIL_PROVIDER` (`smtp` or `resend`)
   - For `smtp`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_USE_TLS`
   - For `resend`: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_API_BASE_URL` (optional, default is `https://api.resend.com`)

Use `backend/.env.example` as a checklist for the full variable set.

Health check endpoint:
- `GET /health`

### 2. Frontend on Vercel

Import the repository in Vercel and set:

- **Root Directory:** `frontend`
- **Framework:** Next.js (auto-detected)

Set environment variables in Vercel:

- `NEXT_PUBLIC_API_BASE_URL=https://<your-render-backend>`

You can start from `frontend/.env.example` for local development parity.

### 3. Cross-Origin (CORS)

CORS is configured in backend code and controlled by `CORS_ALLOWED_ORIGINS`.
Do not use wildcard origins in production for authenticated routes.

## API Endpoints

### Documents
* `GET /api/files`: List all uploaded documents and their latest run status.
* `POST /api/upload`: Upload a new PDF/DOCX file.
* `GET /api/files/<id>/content`: Extract and return parsed text paragraphs.
* `DELETE /api/files/<id>`: Delete a document and all associated analysis runs.

### Analysis & Runs
* `POST /api/analyze`: Trigger a new extraction and evaluation run for a document.
* `GET /api/runs/<run_id>`: Retrieve the full results of a specific run.
* `POST /api/runs/<run_id>/re-extract`: Force the LLM to re-extract a specific check.
* `POST /api/runs/<run_id>/re-judge`: Force the LLM to re-evaluate a specific check.

### Human Review
* `POST /api/reviews`: Submit Human-in-the-Loop feedback (Agree/Disagree/Flag) for a check.
