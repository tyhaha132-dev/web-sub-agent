import "dotenv/config";
import { Client } from "pg";

const arg = process.argv[2] ?? "all";

const client = new Client({
  host: process.env.POSTGRES_HOST ?? "localhost",
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  user: process.env.POSTGRES_USER ?? "postgres",
  password: process.env.POSTGRES_PASSWORD ?? "",
  database: process.env.POSTGRES_DB ?? "web_sub_agent",
  connectionTimeoutMillis: 5000,
});

await client.connect();

if (arg === "all" || arg === "tables") {
  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
  );
  console.log("TABLES:", tables.rows.map((r) => r.table_name).join(", "));
  for (const t of ["words", "quiz_results", "health", "demo_items"]) {
    try {
      const c = await client.query(`SELECT COUNT(*)::int AS c FROM ${t}`);
      console.log(`- ${t}: ${c.rows[0].c} rows`);
    } catch { /* bảng chưa có */ }
  }
}

if (arg === "all" || arg === "words") {
  const limit = Number(process.argv[3] ?? 20);
  const rows = await client.query(
    "SELECT id, en, vi, topic FROM words ORDER BY id LIMIT $1",
    [limit],
  );
  console.table(rows.rows);
}

if (arg === "all" || arg === "quiz") {
  const rows = await client.query(
    "SELECT id, score, total, created_at FROM quiz_results ORDER BY id DESC LIMIT 10",
  );
  console.table(rows.rows);
}

await client.end();
