import { checkFrontendHealth, type ServiceHealth } from './frontend-health.js';
import { checkBackendHealth } from './backend-health.js';
import {
  checkPostgresHealth,
  type DbConfig,
  type PostgresHealth,
} from './database-health.js';

export interface HealthCheckInput {
  frontendUrl: string;
  backendUrl: string;
  dbConfig: DbConfig;
}

export interface HealthSummary {
  status: 'PASSED' | 'FAILED';
  frontend: ServiceHealth;
  backend: ServiceHealth;
  database: PostgresHealth;
}

export async function runHealthChecks(input: HealthCheckInput): Promise<HealthSummary> {
  const [frontend, backend, database] = await Promise.all([
    checkFrontendHealth(input.frontendUrl),
    checkBackendHealth(input.backendUrl),
    checkPostgresHealth(input.dbConfig),
  ]);
  const status = frontend.up && backend.up && database.up ? 'PASSED' : 'FAILED';
  return { status, frontend, backend, database };
}
