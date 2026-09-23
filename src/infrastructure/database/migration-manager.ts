import { Client } from "pg";
import { promises as fs } from "node:fs";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import {
  getDefaultDatabaseConfig,
  type DatabaseConfig,
} from "./database-health.js";

export interface MigrationResult {
  applied: number;
  files: string[];
  skipped: boolean;
}

function resolveMigrationsDir(input: string): string | null {
  if (!existsSync(input)) return null;
  let stat: ReturnType<typeof statSync>;
  try {
    stat = statSync(input);
  } catch {
    return null;
  }
  if (stat.isFile()) return path.dirname(input);
  const nested = path.join(input, "migrations");
  if (existsSync(nested) && statSync(nested).isDirectory()) return nested;
  const backendNested = path.join(input, "backend", "migrations");
  if (existsSync(backendNested) && statSync(backendNested).isDirectory()) {
    return backendNested;
  }
  return input;
}

/**
 * Run *.sql migrations in sorted order through a single pg Client.
 * No-op success when the directory does not exist or holds no .sql files.
 */
export async function runMigrations(
  workspaceOrMigrationsDir: string,
  config: Partial<DatabaseConfig> = {}
): Promise<MigrationResult> {
  const dir = resolveMigrationsDir(workspaceOrMigrationsDir);
  if (dir === null) {
    return { applied: 0, files: [], skipped: true };
  }
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return { applied: 0, files: [], skipped: true };
  }
  const files = entries.filter((f) => f.endsWith(".sql")).sort();
  if (files.length === 0) {
    return { applied: 0, files: [], skipped: true };
  }

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
    const applied: string[] = [];
    for (const file of files) {
      const sql = await fs.readFile(path.join(dir, file), "utf-8");
      console.log(`[migrations] applying ${file}`);
      await client.query(sql);
      applied.push(file);
    }
    return { applied: applied.length, files: applied, skipped: false };
  } finally {
    await client.end();
  }
}
