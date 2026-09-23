import "dotenv/config";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { Client } from "pg";

// Chạy migration của 1 workspace lên Postgres bất kỳ (local hoặc cloud).
// Cách dùng:
//   npx tsx db-migrate.ts workspaces/english-1
// DB cloud (Neon...): đặt thêm POSTGRES_SSL=true và POSTGRES_* trỏ sang cloud.

const workspace = process.argv[2] ?? "workspaces/english-1";
const ssl = (process.env.POSTGRES_SSL ?? "").toLowerCase() === "true";

function resolveMigrationsDir(input: string): string {
  for (const dir of [
    path.join(input, "backend", "migrations"),
    path.join(input, "migrations"),
  ]) {
    if (existsSync(dir)) return dir;
  }
  throw new Error(`No migrations directory found under ${input}`);
}

const dir = resolveMigrationsDir(workspace);
const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
if (files.length === 0) throw new Error(`No .sql files in ${dir}`);

const client = new Client({
  host: process.env.POSTGRES_HOST ?? "localhost",
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  user: process.env.POSTGRES_USER ?? "postgres",
  password: process.env.POSTGRES_PASSWORD ?? "",
  database: process.env.POSTGRES_DB ?? "web_sub_agent",
  connectionTimeoutMillis: 15000,
  ssl: ssl ? { rejectUnauthorized: false } : undefined,
});

await client.connect();
for (const file of files) {
  const sql = await fs.readFile(path.join(dir, file), "utf-8");
  await client.query(sql);
  console.log(`applied ${file}`);
}
await client.end();
console.log(`done: ${files.length} files -> ${process.env.POSTGRES_DB ?? "web_sub_agent"}`);
