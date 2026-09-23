# Contributing

Stack: Next.js + FastAPI + PostgreSQL, TypeScript strict ESM.
Keep models fixed in `src/config/models.ts`, do not swap freely.
Follow `.opencode/rules/AGENTS.md` and `pipeline-contract.md`.
Add unit tests with Vitest; gate AI tests under `tests/integration`.
Run before PR: `npm run check` (typecheck + test).
Start services with `docker compose up -d postgres` for DB tests.
Small diffs, one pipeline concern per PR, update docs.
