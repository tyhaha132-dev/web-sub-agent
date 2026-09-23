import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import path from "node:path";

const execFileAsync = promisify(execFile);

function resolveCommand(command: string): string {
  if (process.platform === "win32" && (command === "npm" || command === "npx")) {
    return `${command}.cmd`;
  }
  return command;
}

export interface InstallResult {
  skipped: boolean;
  stdout?: string;
}

/** Run `npm install` when package.json exists, otherwise no-op success. */
export async function installFrontendDeps(
  frontendDir: string
): Promise<InstallResult> {
  if (!existsSync(path.join(frontendDir, "package.json"))) {
    return { skipped: true };
  }
  const { stdout } = await execFileAsync(resolveCommand("npm"), ["install", "--no-audit", "--no-fund"], {
    cwd: frontendDir,
    timeout: 600_000,
    maxBuffer: 50 * 1024 * 1024,
    shell: process.platform === "win32",
  });
  return { skipped: false, stdout };
}

/**
 * Run `pip install -r requirements.txt` when the file exists,
 * otherwise no-op success. Falls back to pip3 / python -m pip.
 */
export async function installBackendDeps(
  backendDir: string
): Promise<InstallResult> {
  const requirements = path.join(backendDir, "requirements.txt");
  if (!existsSync(requirements)) {
    return { skipped: true };
  }
  const candidates: Array<{ command: string; args: string[] }> = [
    { command: "pip", args: ["install", "-r", "requirements.txt"] },
    { command: "pip3", args: ["install", "-r", "requirements.txt"] },
    { command: "python", args: ["-m", "pip", "install", "-r", "requirements.txt"] },
    { command: "python3", args: ["-m", "pip", "install", "-r", "requirements.txt"] },
  ];
  let lastError: unknown;
  for (const { command, args } of candidates) {
    try {
      const { stdout } = await execFileAsync(resolveCommand(command), args, {
        cwd: backendDir,
        timeout: 600_000,
        maxBuffer: 50 * 1024 * 1024,
        shell: process.platform === "win32",
      });
      return { skipped: false, stdout };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("pip install failed: no pip executable found");
}
