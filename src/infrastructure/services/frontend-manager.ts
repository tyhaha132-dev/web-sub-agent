import { existsSync } from "node:fs";
import path from "node:path";
import {
  startService,
  type ServiceHandle,
} from "./service-manager.js";

export interface FrontendService extends ServiceHandle {
  port: number;
  url: string;
}

/** True when the frontend responds 2xx/3xx on /. */
export async function healthCheck(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${String(port)}/`);
    return res.ok || (res.status >= 200 && res.status < 400);
  } catch {
    return false;
  }
}

export async function checkFrontendHealth(port: number): Promise<boolean> {
  return healthCheck(port);
}

/**
 * Start Next.js dev when package.json exists (`npm run dev -- --port`),
 * else serve the directory statically with `npx serve`.
 */
export function startFrontend(frontendDir: string, port: number): FrontendService {
  const url = `http://localhost:${String(port)}`;
  const hasPackageJson = existsSync(path.join(frontendDir, "package.json"));
  const handle = hasPackageJson
    ? startService({
        cwd: frontendDir,
        command: "npm",
        args: ["run", "dev", "--", "--port", String(port)],
      })
    : startService({
        cwd: frontendDir,
        command: "npx",
        args: ["serve", "-l", String(port), "."],
      });
  return { ...handle, port, url };
}
