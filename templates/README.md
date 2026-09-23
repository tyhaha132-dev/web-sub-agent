# Templates

Minimal Next.js + FastAPI + PostgreSQL starter used to seed per-run workspaces.

## Layout

- `frontend/` — Next.js App Router (TypeScript strict, ESM). `app/page.tsx` reads
  backend status from `NEXT_PUBLIC_API_URL/health`.
- `backend/` — FastAPI with `GET /` and `GET /health` (reads `DATABASE_URL`),
  `app/db.py` exposes `get_engine()`, schema lives in `migrations/001_init.sql`.

## Usage

Copy into an isolated workspace per pipeline run id:

```bash
id=<pipeline-id>
mkdir -p workspaces/$id
cp -r templates/frontend workspaces/$id/frontend
cp -r templates/backend workspaces/$id/backend
```

Then boot dependencies:

```bash
docker compose up -d postgres
cd workspaces/$id/frontend && npm install && npm run dev   # :3000
cd workspaces/$id/backend && pip install -r requirements.txt
DATABASE_URL=postgresql+psycopg2://postgres:change-me@localhost:5432/web_sub_agent \
  uvicorn app.main:app --port 8000
```

Apply the schema once per database:

```bash
psql "$DATABASE_URL" -f workspaces/$id/backend/migrations/001_init.sql
```
