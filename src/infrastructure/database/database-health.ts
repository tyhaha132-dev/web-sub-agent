import { Client } from "pg";

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface DatabaseHealth {
  healthy: boolean;
  durationMs: number;
  error?: string;
}

export function getDefaultDatabaseConfig(
  overrides: Partial<DatabaseConfig> = {}
): DatabaseConfig {
  return {
    host: process.env["POSTGRES_HOST"] ?? "localhost",
    port: Number(process.env["POSTGRES_PORT"] ?? 5432),
    user: process.env["POSTGRES_USER"] ?? "postgres",
    password: process.env["POSTGRES_PASSWORD"] ?? "change-me",
    database: process.env["POSTGRES_DB"] ?? "web_sub_agent",
    ...overrides,
  };
}

/** Connect, run SELECT 1, measure round-trip time. Never throws. */
export async function checkPostgresHealth(
  config: DatabaseConfig
): Promise<DatabaseHealth> {
  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionTimeoutMillis: 5000,
  });
  const started = Date.now();
  try {
    await client.connect();
    await client.query("SELECT 1");
    return { healthy: true, durationMs: Date.now() - started };
  } catch (err) {
    return {
      healthy: false,
      durationMs: Date.now() - started,
      error: err instanceof Error ? err.message : "postgres health check failed",
    };
  } finally {
    try {
      await client.end();
    } catch {
      // ignore close errors
    }
  }
}
