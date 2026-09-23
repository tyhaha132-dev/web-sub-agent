import type { CheckFn, CheckResult, TesterSummary } from './test-result.js';
import { createTesterSummary } from './test-result.js';

export interface Tester {
  run(workspace: string): Promise<TesterSummary>;
}

export function createTester(checks: CheckFn[]): Tester {
  return {
    async run(workspace: string): Promise<TesterSummary> {
      const results: CheckResult[] = [];
      for (const check of checks) {
        const started = Date.now();
        try {
          results.push(await check(workspace));
        } catch (error) {
          results.push({
            name: check.name || 'check',
            status: 'failed',
            message: error instanceof Error ? error.message : String(error),
            durationMs: Date.now() - started,
          });
        }
      }
      return createTesterSummary(results);
    },
  };
}
