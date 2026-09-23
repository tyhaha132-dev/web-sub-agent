import { MODELS } from "../../config/models.js";
import type { Agent, AgentInput } from "../agent-contract.js";
import { failureResult, successResult, type AgentResult } from "../agent-result.js";
import type { AgentExecutor } from "../agent-executor.js";
import { buildCoderPrompt } from "./coder-contract.js";

export class CoderAgent implements Agent {
  readonly role = "coder";
  readonly name = "coder-agent";
  readonly model = MODELS.coder;

  constructor(private readonly executor: AgentExecutor) {}

  async execute(input: AgentInput): Promise<AgentResult> {
    try {
      const context = input.context ?? {};
      const plan = typeof context.plan === "string" ? context.plan : input.prompt;
      const requirements = Array.isArray(context.requirements)
        ? context.requirements.filter((r): r is string => typeof r === "string")
        : [];
      const output = await this.executor.execute(
        this.model,
        buildCoderPrompt({ plan, requirements }),
        input.workspace,
      );
      return successResult(output);
    } catch (err) {
      return failureResult(err instanceof Error ? err.message : String(err));
    }
  }
}
