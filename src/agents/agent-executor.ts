import { runOpenCode } from "../runtime/opencode-runner.js";

export interface AgentExecutor {
  execute(model: string, prompt: string, workspace: string): Promise<string>;
}

export interface OpenCodeAgentExecutorOptions {
  timeoutMs?: number;
  env?: Record<string, string>;
}

export function createOpenCodeAgentExecutor(
  options: OpenCodeAgentExecutorOptions = {},
): AgentExecutor {
  return {
    execute(model: string, prompt: string, workspace: string): Promise<string> {
      return runOpenCode({
        model,
        prompt,
        workspace,
        timeoutMs: options.timeoutMs,
        env: options.env,
      });
    },
  };
}
