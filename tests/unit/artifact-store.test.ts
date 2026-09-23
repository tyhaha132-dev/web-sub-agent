import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { artifactExists, readArtifact, writeArtifact } from '../../src/artifacts/artifact-store.js';

describe('artifact-store (happy path)', () => {
  it('round-trips an artifact through write and read', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wsa-'));
    void dir;
    await writeArtifact('pipeline-1', 'plan.json', '{"steps":[]}');
    const content = await readArtifact('pipeline-1', 'plan.json');
    expect(content).toContain('steps');
  });

  it('reports existence', async () => {
    await writeArtifact('pipeline-2', 'review.json', '{"verdict":"APPROVE"}');
    expect(await artifactExists('pipeline-2', 'review.json')).toBe(true);
    expect(await artifactExists('pipeline-2', 'missing.json')).toBe(false);
  });
});
