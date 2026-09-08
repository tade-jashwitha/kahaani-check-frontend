# Kahaani-Check — Full Stack (Backend + Frontend)

AI-driven voice biomarker and longitudinal health platform for elderly care.

---

## Quick Start (Run Locally)

You can run both the FastAPI backend and Next.js frontend together with a single command.

### Option A: Using NPM (Recommended)

From the root repository directory:

```bash
# 1. Start both servers concurrently
npm run dev
```

This concurrently launches:
- **Backend API**: `http://localhost:8000` (API Docs: `http://localhost:8000/docs`)
- **Frontend App**: `http://localhost:3000`

### Option B: Using Docker Compose

Run both services containerized with a single command:

```bash
# Build and start both containers in the background:
docker compose up -d --build

# View container logs:
docker compose logs -f

# Stop containers:
docker compose down
```

### Option C: Windows One-Click Script

Double-click `run-local.bat` or run in PowerShell:

```powershell
.\run-local.ps1
```

---

## Individual Server Commands

If you prefer running the backend and frontend in separate terminals:

### Backend (FastAPI)
```bash
# From kahaani-check-backend:
.\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
```

### Frontend (Next.js)
```bash
# From kahaani-check-frontend-main:
npm run dev
```

---

## Local Development vs. Supabase Cloud

The application is pre-configured with **Local Development Mode (`LOCAL_DEV_MODE=true`)**:
- Works immediately **offline** without requiring an active Supabase cloud subscription or remote database setup.
- Uses an in-memory/disk store pre-seeded with sample elders, baseline speech metrics, and check-in history.
- Mock authentication allows instant login via "Continue with Google" / "Continue with Apple" or any email.

### Switching to Live Supabase Cloud
To connect to your live Supabase cloud project:
1. In `kahaani-check-backend/.env`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SECRET_KEY=your-service-role-secret-key
   LOCAL_DEV_MODE=false
   ```
2. In `kahaani-check-frontend-main/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   NEXT_PUBLIC_LOCAL_DEV=false
   ```
3. Apply SQL migrations located in `kahaani-check-backend/migrations/` via the Supabase SQL Editor.

---

## Architecture

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, Lucide icons, Recharts.
- **Backend**: FastAPI, Python 3.11, Uvicorn, Pydantic v2.
- **Speech & Audio**: `praat-parselmouth`, `faster-whisper`, `librosa`, `numpy`.
