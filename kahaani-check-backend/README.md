# Kahaani-Check Backend (FastAPI)

## Setup

1. Copy `.env.example` to `.env` and fill in values.
2. `pip install -r requirements.txt`
3. `uvicorn app.main:app --reload`

## Structure

* app/routers    — HTTP endpoints
* app/services — business logic (STT, features, baseline, trajectory, notifications)app/pipeline   — orchestrator wiring the services into the call-processing sequence
* app/core       — config, auth, webhook signature verification
* app/models     — Pydantic schemas
* migrations     — Postgres/Supabase schema (source of truth: PRD \& Architecture doc §7)

See the PRD \& Architecture doc for full endpoint contracts, DB schema, and pipeline rules.

