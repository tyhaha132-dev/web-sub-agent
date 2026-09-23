import { spawn, type ChildProcess } from "node:child_process";

export interface ServiceHandle {
  pid?: number;
  stop(): Promise<void>;
}

export interface StartServiceOptions {
  cwd: string;
  command: string;
  args?: string[];
  port?: number;
  env?: Record<string, string>;
  /** Forward child stdio to parent (default: ignore). */
  inheritStdio?: boolean;
}

export interface WaitForHealthOptions {
  timeoutMs?: number;
  intervalMs?: number;
}

/** Spawn a long-lived process and return a stoppable handle. */
export function startService(options: StartServiceOptions): ServiceHandle {
  const child: ChildProcess = spawn(options.command, options.args ?? [], {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    stdio: options.inheritStdio ? "inherit" : "ignore",
    shell: false,
    windowsHide: true,
  });

  let stopped = false;

  const stop = async (): Promise<void> => {
    if (stopped) return;
    stopped = true;
    if (child.exitCode !== null || child.signalCode !== null) return;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {
          // ignore
        }
        resolve();
      }, 5000);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
      try {
        child.kill("SIGTERM");
      } catch {
        clearTimeout(timer);
        resolve();
      }
    });
  };

  child.on("error", () => {
    // Errors surface via health checks / explicit waits; keep handle usable.
  });

  return { pid: child.pid, stop };
}

/** Poll an HTTP url until it responds 2xx/3xx or the timeout expires. */
export async function waitForHealth(
  url: string,
  options: WaitForHealthOptions = {}
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const intervalMs = options.intervalMs ?? 1000;
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok || (res.status >= 200 && res.status < 400)) {
        return;
      }
      lastError = new Error(`health check status ${String(res.status)}`);
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw lastError instanceof Error
    ? new Error(`Service at ${url} not healthy: ${lastError.message}`)
    : new Error(`Service at ${url} not healthy within ${String(timeoutMs)}ms`);
}
