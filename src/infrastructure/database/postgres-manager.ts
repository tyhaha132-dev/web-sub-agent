import { Client } from "pg";
import {
  getDefaultDatabaseConfig,
  type DatabaseConfig,
} from "./database-health.js";

/** Build a libpq connection string for the given config. */
export function getConnectionString(config: DatabaseConfig): string {
  const user = encodeURIComponent(config.user);
  const password = encodeURIComponent(config.password);
  return `postgresql://${user}:${password}@${config.host}:${String(config.port)}/${config.database}`;
}

function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Create the target database when it does not exist.
 * Connects to the default `postgres` maintenance database.
 */
export async function ensureDatabase(
  config: Partial<DatabaseConfig> = {}
): Promise<void> {
  const resolved = getDefaultDatabaseConfig(config);
  const client = new Client({
    host: resolved.host,
    port: resolved.port,
    user: resolved.user,
    password: resolved.password,
    database: "postgres",
    connectionTimeoutMillis: 5000,
  });
  await client.connect();
  try {
    const existing = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [resolved.database]
    );
    const rows = (existing as { rows?: unknown[] }).rows ?? [];
    if (rows.length === 0) {
      await client.query(`CREATE DATABASE ${quoteIdentifier(resolved.database)}`);
    }
  } finally {
    await client.end();
  }
}
