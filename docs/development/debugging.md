# Debugging

Check env first: `loadConfig()` fallbacks mask missing POSTGRES_*.
Inspect run: `artifacts/pipelines/<id>/audit.log` is JSONL per event.
Pipeline states: watch `onStateChange` lines for stuck transitions.
Timeouts: raise `PROCESS_TIMEOUT_MS` for slow model or DB steps.
Postgres: `docker compose logs postgres`, verify port 5432 reachable.
Ports: confirm `FRONTEND_PORT` and `BACKEND_PORT` are free.
Type errors: `npm run typecheck` before `npm test`.
Isolate: rerun one pipeline id in fresh `workspaces/` dir.
