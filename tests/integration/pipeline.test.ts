import { describe, it } from 'vitest';

// Full pipeline run (queued -> planning -> coding -> reviewing -> done) hits
// real Planner/Coder/Reviewer models, so it stays skipped in normal `npm test`.
// Run explicitly with `npm run test:ai` once model keys are configured.
describe.skip('pipeline integration', () => {
  it.todo('runs a fixture project to done with reviewer APPROVE');
  it.todo('loops coder -> reviewer until max iterations, then marks failed');
  it.todo('appends every transition to artifacts/pipelines/<id>/audit.log');
});
