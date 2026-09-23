import { describe, it } from 'vitest';

// Needs real Planner/Coder/Reviewer model bindings, so it stays skipped
// in normal `npm test`. Run explicitly with `npm run test:ai`.
describe.skip('opencode integration', () => {
  it.todo('planner decomposes a fixture prompt into plan.json steps');
  it.todo('coder implements one step within the file allowlist');
  it.todo('reviewer returns APPROVE or REQUEST_CHANGES with file/line notes');
});
