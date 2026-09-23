# Architecture Overview

System name: web-sub-agent.
Goal: turn web requirements into reviewed code via Planner -> Coder -> Reviewer.
Frontend: Next.js App Router, TypeScript strict, ESM.
Backend: FastAPI with Pydantic schemas and REST endpoints.
Database: PostgreSQL, migrations versioned in SQL files.
Orchestration: Node.js pipeline in `src/`, config in `src/config/`.
Logging: base logger, pipeline logger, audit logger.
Artifacts: `artifacts/pipelines/<id>/` holds plan, diff, review, audit log.
Workspaces: isolated per-run checkout under `workspaces/`.
Ports: frontend 3000, backend 8000, Postgres 5432 by default.
Config: env-driven via `loadConfig()` with safe fallbacks.
Models: fixed trio in `src/config/models.ts`.
Contract: state machine queued -> planning -> coding -> reviewing -> done/failed.
Tests: Vitest unit plus integration gated behind env.
Deploy: docker compose for Postgres, npm for frontend pipeline.
