import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { runTestCommand } from '../test-runner.js';
import {
  combineResults,
  skipResult,
  type CheckResult,
} from '../test-result.js';
import { findPython, resolveBackendDir, resolveFrontendDir } from './build-check.js';

export async function checkFrontendTypecheck(frontendDir: string): Promise<CheckResult> {
  if (!existsSync(join(frontendDir, 'tsconfig.json'))) {
    return skipResult('frontend-typecheck', `pass (skipped: no tsconfig.json in ${frontendDir})`);
  }
  return runTestCommand(frontendDir, {
    command: 'npx',
    args: ['tsc', '--noEmit'],
    timeoutMs: 300000,
    name: 'frontend-typecheck',
  });
}

export async function checkBackendTypecheck(backendDir: string): Promise<CheckResult> {
  const python = await findPython();
  if (python === null) {
    return skipResult('backend-typecheck', 'pass (skipped: python not found)');
  }
  const probe = await runTestCommand(backendDir, {
    command: python,
    args: ['-m', 'mypy', '--version'],
    timeoutMs: 60000,
    name: 'mypy-probe',
  });
  if (probe.status !== 'passed') {
    return skipResult('backend-typecheck', 'pass (skipped: mypy not installed)');
  }
  return runTestCommand(backendDir, {
    command: python,
    args: ['-m', 'mypy', 'app'],
    timeoutMs: 300000,
    name: 'backend-typecheck',
  });
}

export async function checkTypecheck(workspace: string): Promise<CheckResult> {
  const results = await Promise.all([
    checkFrontendTypecheck(resolveFrontendDir(workspace)),
    checkBackendTypecheck(resolveBackendDir(workspace)),
  ]);
  return combineResults('typecheck', results);
}
