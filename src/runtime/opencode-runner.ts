import { isSuccess } from "./process-result.js";
import { runProcess } from "./process-runner.js";

export interface RunOpenCodeOptions {
  model: string;
  prompt: string;
  workspace: string;
  timeoutMs?: number;
  env?: Record<string, string>;
}

function isMissingBinary(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("ENOENT") || msg.toLowerCase().includes("spawn opencode");
}

export async function runOpenCode({ model, prompt, workspace, timeoutMs, env }: RunOpenCodeOptions): Promise<string> {
  let result;
  try {
    result = await runProcess(workspace, "opencode", ["run", "--model", model, prompt], timeoutMs, env);
  } catch (error: unknown) {
    if (isMissingBinary(error)) {
      throw new Error("opencode binary not found in PATH. Install opencode to use runOpenCode().", { cause: error });
    }
    throw error;
  }
  if (!isSuccess(result)) {
    throw new Error(`opencode run failed (exit ${result.exitCode}): ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}
