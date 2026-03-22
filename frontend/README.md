# LLM Policy Validator — Frontend

The Next.js web application that provides the user interface for the LLM Policy Validator. It connects to the Flask backend API to manage documents, run LLM-based policy analyses, review results, configure checks and models, and benchmark against ground truth baselines.

## Technology Stack

| Concern | Technology |
|---------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI Library | React 19 |
| Styling | Tailwind CSS v4 |
| Charts | Recharts 3 |
| Icons | Lucide React |
| Theming | next-themes (light/dark mode) |
| Font | Geist (via `next/font`) |

## Directory Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout (fonts, theme provider, metadata)
│   │   ├── globals.css            # Global styles & Tailwind imports
│   │   ├── (auth)/                # Auth route group (unauthenticated)
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx     # Login page
│   │   │   └── register/page.tsx  # Registration page
│   │   └── (app)/                 # App route group (authenticated)
│   │       ├── layout.tsx         # App shell (sidebar, topnav)
│   │       ├── page.tsx           # Dashboard (KPIs, agreement charts)
│   │       ├── documents/         # Document management (upload, list, analyze)
│   │       ├── runs/              # Run results & human review
│   │       │   ├── results/       # Detailed check results view
│   │       │   └── review/        # Review history page
│   │       ├── configuration/     # Settings & configuration
│   │       │   ├── checks/        # Checks library management
│   │       │   ├── judge/         # Judge prompt & rubric settings
│   │       │   └── settings/      # LLM model & parameter tuning
│   │       └── reports/           # Agreement reports & benchmarks
│   ├── components/
│   │   ├── layout/                # Sidebar, TopNav, NavBar, PageHeader
│   │   ├── ui/                    # Reusable UI components
│   │   │   ├── ApiWakeupGuard.tsx # Shows loading state while backend wakes up
│   │   │   ├── Button.tsx         # Button component (CVA variants)
│   │   │   ├── Card.tsx           # Card component
│   │   │   ├── ConfirmDeleteDialog.tsx
│   │   │   ├── InfoTooltip.tsx    # Hover tooltip for info icons
│   │   │   ├── NoticeDialog.tsx   # Notification dialog
│   │   │   ├── Skeleton.tsx       # Loading skeleton
│   │   │   ├── Spinner.tsx        # Loading spinner
│   │   │   └── UserTutorial.tsx   # Interactive onboarding tutorial
│   │   ├── ThemeProvider.tsx      # next-themes provider wrapper
│   │   └── ThemeToggle.tsx        # Light/dark mode toggle
│   ├── contexts/
│   │   ├── AuthContext.tsx        # JWT auth state, login/logout, token management
│   │   └── DocumentCacheContext.tsx # Client-side document list caching
│   └── lib/
│       ├── api.ts                 # Centralized API client (fetch wrapper with auth headers)
│       └── utils.ts               # Utility functions (e.g. cn() for class merging)
├── public/                        # Static assets
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── .env.example                   # Environment variable template
└── .gitignore
```

## Pages & Features

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Email/password login |
| Register | `/register` | User registration (pending admin approval) |
| Dashboard | `/` | KPIs (total documents, runs, avg score, flagged), agreement distribution chart |
| Documents | `/documents` | Upload, list, delete documents; trigger analysis runs with check selection |
| Run Results | `/runs/results/[id]` | Per-check extraction results, judge verdicts, scores, and review actions |
| Review History | `/runs/review` | List of all human reviews with status filtering |
| Checks Library | `/configuration/checks` | CRUD for framework checks; bulk JSON upload |
| Judge Settings | `/configuration/judge` | Edit judge system prompt & evaluation rubric; live test |
| LLM Settings | `/configuration/settings` | Choose models, tune temperature/tokens/top_p |
| Reports | `/reports` | Agreement reports, benchmark results & history |

## Setup & Installation

### Prerequisites

- **Node.js 18+** and npm
- The backend API must be running (see `backend/README.md`)

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Environment Variables

Copy the example file and configure:

```bash
cp .env.example .env.local
```

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | URL of the Flask backend API | `http://localhost:5000` |

### 3. Start the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server (hot reload) |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |

## Production Deployment (Vercel)

Import the repository in [Vercel](https://vercel.com) and configure:

| Setting | Value |
|---------|-------|
| Root Directory | `frontend` |
| Framework | Next.js (auto-detected) |

### Environment Variables on Vercel

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://<your-render-backend>` |

### CORS

Make sure the backend's `CORS_ALLOWED_ORIGINS` includes your Vercel domain. The backend also auto-allows `*.vercel.app` subdomains by default.
