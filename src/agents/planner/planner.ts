import { MODELS } from "../../config/models.js";
import type { Agent, AgentInput } from "../agent-contract.js";
import { failureResult, successResult, type AgentResult } from "../agent-result.js";
import type { AgentExecutor } from "../agent-executor.js";
import { buildPlannerPrompt } from "./planner-contract.js";

export class PlannerAgent implements Agent {
  readonly role = "planner";
  readonly name = "planner-agent";
  readonly model = MODELS.planner;

  constructor(private readonly executor: AgentExecutor) {}

  async execute(input: AgentInput): Promise<AgentResult> {
    try {
      const prompt = buildPlannerPrompt(input.prompt);
      const output = await this.executor.execute(this.model, prompt, input.workspace);
      return successResult(output);
    } catch (err) {
      return failureResult(err instanceof Error ? err.message : String(err));
    }
  }
}
