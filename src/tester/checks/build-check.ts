import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runTestCommand } from '../test-runner.js';
import { combineResults, skipResult, type CheckResult } from '../test-result.js';

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

export function resolveFrontendDir(workspace: string): string {
  const nested = join(workspace, 'frontend');
  return existsSync(nested) ? nested : workspace;
}

export function resolveBackendDir(workspace: string): string {
  const nested = join(workspace, 'backend');
  return existsSync(nested) ? nested : workspace;
}

export async function findPython(): Promise<string | null> {
  for (const candidate of ['python', 'python3']) {
    const probe = await runTestCommand(process.cwd(), {
      command: candidate,
      args: ['--version'],
      timeoutMs: 30000,
      name: 'python-probe',
    });
    if (probe.status === 'passed') {
      return candidate;
    }
  }
  return null;
}

export async function checkFrontendBuild(frontendDir: string): Promise<CheckResult> {
  if (!hasScript(frontendDir, 'build')) {
    return skipResult('frontend-build', `pass (skipped: no build script in ${frontendDir})`);
  }
  return runTestCommand(frontendDir, {
    command: 'npm',
    args: ['run', 'build'],
    timeoutMs: 600000,
    name: 'frontend-build',
    env: { NODE_ENV: 'production' },
  });
}

export async function checkBackendBuild(backendDir: string): Promise<CheckResult> {
  if (!existsSync(join(backendDir, 'app'))) {
    return skipResult('backend-build', `pass (skipped: no app/ in ${backendDir})`);
  }
  const python = await findPython();
  if (python === null) {
    return skipResult('backend-build', 'pass (skipped: python not found)');
  }
  return runTestCommand(backendDir, {
    command: python,
    args: ['-m', 'compileall', 'app'],
    timeoutMs: 300000,
    name: 'backend-build',
  });
}

export async function checkBuild(workspace: string): Promise<CheckResult> {
  const results = await Promise.all([
    checkFrontendBuild(resolveFrontendDir(workspace)),
    checkBackendBuild(resolveBackendDir(workspace)),
  ]);
  return combineResults('build', results);
}
