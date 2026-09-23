export interface PostgresConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface AppConfig {
  nodeEnv: string;
  pipelineMaxIterations: number;
  processTimeoutMs: number;
  postgres: PostgresConfig;
  frontendPort: number;
  backendPort: number;
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value !== undefined && value !== "" ? parsed : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    nodeEnv: env["NODE_ENV"] ?? "development",
    pipelineMaxIterations: parseNumber(env["PIPELINE_MAX_ITERATIONS"], 5),
    processTimeoutMs: parseNumber(env["PROCESS_TIMEOUT_MS"], 30000),
    postgres: {
      host: env["POSTGRES_HOST"] ?? "localhost",
      port: parseNumber(env["POSTGRES_PORT"], 5432),
      user: env["POSTGRES_USER"] ?? "postgres",
      password: env["POSTGRES_PASSWORD"] ?? "postgres",
      database: env["POSTGRES_DB"] ?? "web_sub_agent",
    },
    frontendPort: parseNumber(env["FRONTEND_PORT"], 3000),
    backendPort: parseNumber(env["BACKEND_PORT"], 8000),
  };
}

export const CONFIG: AppConfig = loadConfig();
