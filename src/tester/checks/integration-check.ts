import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runTestCommand } from '../test-runner.js';
import { skipResult, type CheckResult } from '../test-result.js';
import { resolveFrontendDir } from './build-check.js';

function hasScript(dir: string, name: string): boolean {
  try {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };
    return typeof pkg.scripts?.[name] === 'string';
  } catch {
    return false;
  }
}

export async function checkIntegration(workspace: string): Promise<CheckResult> {
  const dir = resolveFrontendDir(workspace);
  if (!hasScript(dir, 'test:integration')) {
    return skipResult('integration', `pass (skipped: no test:integration script in ${dir})`);
  }
  return runTestCommand(dir, {
    command: 'npm',
    args: ['run', 'test:integration'],
    timeoutMs: 600000,
    name: 'integration',
  });
}
