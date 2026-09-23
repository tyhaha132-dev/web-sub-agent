import { spawn } from "node:child_process";
import { ERROR_CODES } from "../errors/error-codes.js";
import { PipelineError } from "../errors/pipeline-error.js";
import type { ProcessResult } from "./process-result.js";

export async function runProcess(
  cwd: string,
  command: string,
  args: string[],
  timeoutMs?: number,
  env?: Record<string, string>,
): Promise<ProcessResult> {
  const startedAt = Date.now();
  return new Promise<ProcessResult>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      env: env !== undefined ? { ...process.env, ...env } : process.env,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = timeoutMs !== undefined
      ? setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill("SIGKILL");
        reject(new PipelineError(ERROR_CODES.TIMEOUT, `Process timed out after ${timeoutMs}ms: ${command}`));
      }, timeoutMs)
      : undefined;
    timer?.unref?.();

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += String(chunk);
    });
    child.on("error", (err: Error) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code: number | null) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve({ exitCode: code ?? 1, stdout, stderr, durationMs: Date.now() - startedAt });
    });
  });
}
