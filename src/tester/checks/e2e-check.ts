import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { runTestCommand } from '../test-runner.js';
import { skipResult, type CheckResult } from '../test-result.js';
import { resolveFrontendDir } from './build-check.js';

const PLAYWRIGHT_CONFIGS = [
  'playwright.config.ts',
  'playwright.config.js',
  'playwright.config.mjs',
  'playwright.config.cts',
];

function findPlaywrightDir(workspace: string): string | null {
  const candidates = [resolveFrontendDir(workspace), workspace];
  for (const dir of candidates) {
    if (PLAYWRIGHT_CONFIGS.some((file) => existsSync(join(dir, file)))) {
      return dir;
    }
  }
  return null;
}

export async function checkE2e(workspace: string): Promise<CheckResult> {
  const dir = findPlaywrightDir(workspace);
  if (dir === null) {
    return skipResult('e2e', 'pass (skipped: no playwright.config found)');
  }
  return runTestCommand(dir, {
    command: 'npx',
    args: ['playwright', 'test'],
    timeoutMs: 600000,
    name: 'e2e',
  });
}
