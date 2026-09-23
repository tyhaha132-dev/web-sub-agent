import type { CheckResult } from '../test-result.js';
import {
  checkPostgresHealth,
  dbConfigFromEnv,
  type DbConfig,
} from '../health/database-health.js';

// Wraps checkPostgresHealth (contract: src/contracts/database.ts).
// Until that module lands, the implementation lives in health/database-health.ts
// and is re-used here so both paths share one TCP health probe.
export async function checkDatabase(workspace: string, dbConfig?: DbConfig): Promise<CheckResult> {
  void workspace;
  const started = Date.now();
  const config = dbConfig ?? dbConfigFromEnv();
  const health = await checkPostgresHealth(config);
  if (health.up) {
    return {
      name: 'database',
      status: 'passed',
      message: `postgres reachable at ${config.host}:${config.port} (${health.latencyMs}ms)`,
      durationMs: Date.now() - started,
    };
  }
  return {
    name: 'database',
    status: 'failed',
    message: `postgres unreachable at ${config.host}:${config.port}: ${health.error ?? 'unknown error'}`,
    durationMs: Date.now() - started,
  };
}
