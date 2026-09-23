# Setup

Requirements: Node 20+, Docker Compose, npm.
Copy env: `cp .env.example .env` then set POSTGRES_* and ports.
Install: `npm install`.
Start Postgres: `docker compose up -d postgres`.
Run pipeline: `npm start`.
Verify: `npm run typecheck && npm test`.
Frontend dev: Next.js on `FRONTEND_PORT` (default 3000).
Backend dev: FastAPI on `BACKEND_PORT` (default 8000).
