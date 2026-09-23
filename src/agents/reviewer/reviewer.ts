import { MODELS } from "../../config/models.js";
import type { Agent, AgentInput } from "../agent-contract.js";
import { failureResult, successResult, type AgentResult } from "../agent-result.js";
import type { AgentExecutor } from "../agent-executor.js";
import { buildReviewPrompt } from "./reviewer-contract.js";

export class ReviewerAgent implements Agent {
  readonly role = "reviewer";
  readonly name = "reviewer-agent";
  readonly model = MODELS.reviewer;

  constructor(private readonly executor: AgentExecutor) {}

  async execute(input: AgentInput): Promise<AgentResult> {
    try {
      const context = input.context ?? {};
      const diff = typeof context.diff === "string" ? context.diff : input.prompt;
      const testResults = typeof context.testResults === "string" ? context.testResults : "";
      const output = await this.executor.execute(
        this.model,
        buildReviewPrompt({ diff, testResults }),
        input.workspace,
      );
      return successResult(output);
    } catch (err) {
      return failureResult(err instanceof Error ? err.message : String(err));
    }
  }
}
