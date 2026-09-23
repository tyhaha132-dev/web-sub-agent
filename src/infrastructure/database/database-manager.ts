import { Pool } from "pg";
import {
  checkPostgresHealth,
  getDefaultDatabaseConfig,
  type DatabaseConfig,
  type DatabaseHealth,
} from "./database-health.js";

export interface DatabaseManager {
  connect(): Promise<void>;
  health(): Promise<DatabaseHealth>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query(text: string, params?: any[]): Promise<any>;
  close(): Promise<void>;
}

/** Create a_pool backed manager. Config defaults come from POSTGRES_* env vars. */
export function createDatabaseManager(
  config: Partial<DatabaseConfig> = {}
): DatabaseManager {
  const resolved = getDefaultDatabaseConfig(config);
  const pool = new Pool({
    host: resolved.host,
    port: resolved.port,
    user: resolved.user,
    password: resolved.password,
    database: resolved.database,
    connectionTimeoutMillis: 5000,
  });

  return {
    async connect(): Promise<void> {
      const client = await pool.connect();
      try {
        await client.query("SELECT 1");
      } finally {
        client.release();
      }
    },
    async health(): Promise<DatabaseHealth> {
      return checkPostgresHealth(resolved);
    },
    async query(text: string, params?: any[]): Promise<any> {
      return pool.query(text, params);
    },
    async close(): Promise<void> {
      await pool.end();
    },
  };
}
