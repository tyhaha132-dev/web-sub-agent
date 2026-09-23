import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface EnvCheckResult {
  available: boolean;
  version?: string;
  error?: string;
}

async function runVersion(
  command: string,
  args: string[] = ["--version"]
): Promise<EnvCheckResult> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      timeout: 15_000,
    });
    const version = `${stdout ?? ""}${stderr ?? ""}`.trim();
    return { available: true, version: version || undefined };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "command failed";
    return { available: false, error: message };
  }
}

export async function checkNode(): Promise<EnvCheckResult> {
  return runVersion("node", ["--version"]);
}

export async function checkPython(): Promise<EnvCheckResult> {
  const primary = await runVersion("python", ["--version"]);
  if (primary.available) return primary;
  return runVersion("python3", ["--version"]);
}

export async function checkDocker(): Promise<EnvCheckResult> {
  return runVersion("docker", ["--version"]);
}
