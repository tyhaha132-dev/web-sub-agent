# Database

Engine: PostgreSQL, default db `web_sub_agent` on port 5432.
Config: `POSTGRES_HOST/PORT/USER/PASSWORD/DB` via `loadConfig()`.
Access: FastAPI backend only; Next.js calls API, never SQL directly.
Driver: `pg` for Node tooling, SQLAlchemy/psycopg path for FastAPI.
Migrations: plain versioned SQL files, one direction per file.
Reviewer rejects undeclared schema changes or destructive alters.
Local run: `docker compose up -d postgres` provisions the volume.
Connection string built from config, no secrets in repo.
Seed data lives outside migrations for dev convenience.
Indexes and constraints declared explicitly in migration SQL.
Audit trail of schema-affecting runs kept under artifacts.
Backup: `pg_dump` before manual production migration.
Health: backend `/health` checks pool connectivity.
Timeouts: statement timeout aligned with `PROCESS_TIMEOUT_MS`.
Naming: snake_case tables, singular relations avoided.
Types: timestamptz for dates, uuid or serial for keys.
