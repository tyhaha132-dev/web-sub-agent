export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface DatabaseHealth {
  available: boolean;
  host: string;
  port: number;
  database: string;
  user: string;
  durationMs: number;
  error?: string;
}
