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
