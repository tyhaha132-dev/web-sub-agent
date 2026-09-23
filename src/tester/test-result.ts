export type CheckStatus = 'passed' | 'failed' | 'skipped';

export interface TestResult {
  name: string;
  status: CheckStatus;
  message: string;
  durationMs: number;
  exitCode?: number;
}

export type CheckResult = TestResult;

export type CheckFn = (workspace: string) => Promise<CheckResult>;

export interface ProcessResult {
  command: string;
  args: string[];
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

export type TesterStatus = 'PASSED' | 'FAILED';

export interface TesterSummary {
  status: TesterStatus;
  results: CheckResult[];
  passed: number;
  failed: number;
  skipped: number;
}

export function createTestResult(processResult: ProcessResult, name?: string): TestResult {
  const label = name ?? `${processResult.command} ${processResult.args.join(' ')}`.trim();
  const output = (processResult.stderr || processResult.stdout || '').trim();
  if (processResult.timedOut) {
    const detail = output ? `: ${output.slice(0, 1000)}` : '';
    return {
      name: label,
      status: 'failed',
      message: `timed out${detail}`,
      durationMs: processResult.durationMs,
      exitCode: processResult.exitCode,
    };
  }
  if (processResult.exitCode === 0) {
    return {
      name: label,
      status: 'passed',
      message: output.slice(0, 500) || 'ok',
      durationMs: processResult.durationMs,
      exitCode: 0,
    };
  }
  return {
    name: label,
    status: 'failed',
    message: output.slice(0, 1000) || `exit code ${processResult.exitCode}`,
    durationMs: processResult.durationMs,
    exitCode: processResult.exitCode,
  };
}

export function skipResult(name: string, reason: string): TestResult {
  return { name, status: 'skipped', message: reason, durationMs: 0 };
}

export function combineResults(name: string, results: CheckResult[]): CheckResult {
  const failed = results.filter((r) => r.status === 'failed');
  const durationMs = results.reduce((sum, r) => sum + r.durationMs, 0);
  if (failed.length > 0) {
    return {
      name,
      status: 'failed',
      message: failed.map((r) => `${r.name}: ${r.message}`).join(' | '),
      durationMs,
    };
  }
  return {
    name,
    status: 'passed',
    message: results.map((r) => `${r.name}: ${r.message}`).join(' | ') || 'ok',
    durationMs,
  };
}

export function createTesterSummary(results: CheckResult[]): TesterSummary {
  const passed = results.filter((r) => r.status === 'passed').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  return {
    status: failed === 0 ? 'PASSED' : 'FAILED',
    results,
    passed,
    failed,
    skipped,
  };
}
