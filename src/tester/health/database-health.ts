import { Socket } from 'node:net';

export interface DbConfig {
  host: string;
  port: number;
  user?: string;
  password?: string;
  database?: string;
}

export interface PostgresHealth {
  up: boolean;
  latencyMs: number;
  error?: string;
}

export function dbConfigFromEnv(env: NodeJS.ProcessEnv = process.env): DbConfig {
  return {
    host: env.POSTGRES_HOST ?? 'localhost',
    port: Number(env.POSTGRES_PORT ?? 5432),
    user: env.POSTGRES_USER ?? 'postgres',
    password: env.POSTGRES_PASSWORD ?? 'change-me',
    database: env.POSTGRES_DB ?? 'web_sub_agent',
  };
}

export function checkPostgresHealth(config: DbConfig, timeoutMs = 5000): Promise<PostgresHealth> {
  const started = Date.now();
  return new Promise((resolve) => {
    const socket = new Socket();
    let settled = false;
    const done = (result: PostgresHealth): void => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(result);
      }
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      done({ up: true, latencyMs: Date.now() - started });
    });
    socket.once('timeout', () => {
      done({ up: false, latencyMs: Date.now() - started, error: 'connection timed out' });
    });
    socket.once('error', (error: Error) => {
      done({ up: false, latencyMs: Date.now() - started, error: error.message });
    });
    socket.connect(config.port, config.host);
  });
}
