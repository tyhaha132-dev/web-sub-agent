import { describe, it } from 'vitest';

// Needs a live Postgres (`docker compose up -d postgres`) plus migrated
// ephemeral schema, so it stays skipped in normal `npm test`.
// Run explicitly with `npm run test:ai`.
describe.skip('database integration', () => {
  it.todo('applies migrations/001_init.sql to an ephemeral schema');
  it.todo('inserts and reads a health row, then drops the schema');
  it.todo('reports unhealthy when Postgres is unreachable');
});
