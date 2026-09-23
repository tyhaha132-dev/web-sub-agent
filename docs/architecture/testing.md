# Testing

Runner: Vitest, `npm test` excludes `tests/integration/**`.
AI-gated suite: `npm run test:ai` runs `tests/integration`.
Typecheck: `npm run typecheck` is `tsc --noEmit`, strict true.
Full gate: `npm run check` runs typecheck then unit tests.
Unit scope: config loaders, path constants, loggers, state machine.
Integration scope: pipeline runs hitting agents or Postgres.
Env for integration: Postgres up, model keys set, longer timeout.
Frontend: component render plus route data-fetch mocks.
Backend: FastAPI TestClient for routers and Pydantic validation.
DB: ephemeral schema per test file, migrated then dropped.
Artifacts: test runs write under temp pipelines dir, not real.
Coverage: focus branches in config parsing and logger wrapping.
Flakes: retry once, then mark failed with audit excerpt.
CI order: install, typecheck, unit, compose postgres, integration.
Rule: reviewer APPROVE requires green typecheck and tests.
