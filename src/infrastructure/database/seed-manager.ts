import { Client } from "pg";
import {
  getDefaultDatabaseConfig,
  type DatabaseConfig,
} from "./database-health.js";

export interface SeedResult {
  seeded: boolean;
  items: number;
}

export async function seedDemoData(
  config: Partial<DatabaseConfig> = {},
): Promise<SeedResult> {
  const resolved = getDefaultDatabaseConfig(config);
  const client = new Client({
    host: resolved.host,
    port: resolved.port,
    user: resolved.user,
    password: resolved.password,
    database: resolved.database,
    connectionTimeoutMillis: 5000,
  });
  await client.connect();
  try {
    await client.query(
      "CREATE TABLE IF NOT EXISTS demo_items (id SERIAL PRIMARY KEY, title TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now())",
    );
    const count = await client.query("SELECT COUNT(*)::int AS c FROM demo_items");
    const existing = Number(count.rows[0]?.c ?? 0);
    if (existing > 0) {
      return { seeded: false, items: existing };
    }
    await client.query(
      "INSERT INTO demo_items (title) VALUES ($1), ($2), ($3)",
      ["Welcome to your new site", "Built with Next.js + FastAPI", "Powered by PostgreSQL"],
    );
    return { seeded: true, items: 3 };
  } finally {
    await client.end();
  }
}
