# Agent Rules

1. Planner plans, coder codes, reviewer verifies. No role skipping.
2. Fixed models: planner nemotron-3-ultra-free, coder muse-spark-1.3, reviewer mimo-v2.6-flash-free.
3. Stack only: Next.js frontend, FastAPI backend, PostgreSQL database.
4. Every run logs to artifacts/pipelines/<id>/audit.log.
5. TypeScript strict, ESM, `npm run typecheck` must pass.
