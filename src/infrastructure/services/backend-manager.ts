import { existsSync } from "node:fs";
import path from "node:path";
import {
  startService,
  waitForHealth,
  type ServiceHandle,
} from "./service-manager.js";

export interface BackendService extends ServiceHandle {
  port: number;
  url: string;
}

function hasFastApiApp(backendDir: string): boolean {
  return existsSync(path.join(backendDir, "app", "main.py"));
}

async function tryFetchOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    return res.ok || (res.status >= 200 && res.status < 400);
  } catch {
    return false;
  }
}

/** Probe /health, then /docs, then / — true on first success. */
export async function healthCheck(port: number): Promise<boolean> {
  const base = `http://localhost:${String(port)}`;
  for (const p of ["/health", "/docs", "/"]) {
    if (await tryFetchOk(base + p)) return true;
  }
  return false;
}

export async function checkBackendHealth(port: number): Promise<boolean> {
  return healthCheck(port);
}

/**
 * Start the FastAPI backend with uvicorn when app/main.py exists,
 * else fall back to `python -m http.server` for static preview.
 */
export function startBackend(backendDir: string, port: number): BackendService {
  const url = `http://localhost:${String(port)}`;
  const handle = hasFastApiApp(backendDir)
    ? startService({
        cwd: backendDir,
        command: "uvicorn",
        args: ["app.main:app", "--host", "0.0.0.0", "--port", String(port)],
      })
    : startService({
        cwd: backendDir,
        command: "python",
        args: ["-m", "http.server", String(port)],
      });
  return { ...handle, port, url };
}

/** Start the backend then wait until it answers health probes. */
export async function startBackendAndWait(
  backendDir: string,
  port: number,
  timeoutMs = 60_000
): Promise<BackendService> {
  const svc = startBackend(backendDir, port);
  await waitForHealth(`http://localhost:${String(port)}/health`, {
    timeoutMs,
  }).catch(() =>
    waitForHealth(`http://localhost:${String(port)}/docs`, { timeoutMs: 15_000 })
  );
  return svc;
}
