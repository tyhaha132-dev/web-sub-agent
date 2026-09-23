import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runTestCommand } from '../test-runner.js';
import { skipResult, type CheckResult } from '../test-result.js';
import { resolveFrontendDir } from './build-check.js';

interface PackageJson {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readPackageJson(dir: string): PackageJson | null {
  try {
    return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as PackageJson;
  } catch {
    return null;
  }
}

export async function checkUnit(workspace: string): Promise<CheckResult> {
  const dir = resolveFrontendDir(workspace);
  const pkg = readPackageJson(dir);
  if (pkg === null) {
    return skipResult('unit', `pass (skipped: no package.json in ${dir})`);
  }
  const hasVitest =
    typeof pkg.devDependencies?.['vitest'] === 'string' ||
    typeof pkg.dependencies?.['vitest'] === 'string';
  if (hasVitest) {
    return runTestCommand(dir, {
      command: 'npx',
      args: ['vitest', 'run'],
      timeoutMs: 600000,
      name: 'unit',
    });
  }
  if (typeof pkg.scripts?.['test'] === 'string') {
    return runTestCommand(dir, {
      command: 'npm',
      args: ['test', '--', '--run'],
      timeoutMs: 600000,
      name: 'unit',
    });
  }
  return skipResult('unit', `pass (skipped: no test runner in ${dir})`);
}
