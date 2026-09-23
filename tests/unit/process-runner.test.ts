import { describe, expect, it } from 'vitest';
import { runProcess } from '../../src/runtime/process-runner.js';

describe('process-runner (happy path)', () => {
  it('captures stdout of a successful command', async () => {
    const result = await runProcess(process.cwd(), process.execPath, [
      '-e',
      "console.log('ok')",
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('ok');
  });

  it('reports a non-zero exit code on failure', async () => {
    const result = await runProcess(process.cwd(), process.execPath, [
      '-e',
      'process.exit(3)',
    ]);
    expect(result.exitCode).toBe(3);
  });
});
