import type { Agent } from "./agent-contract.js";
import { createOpenCodeAgentExecutor, type AgentExecutor } from "./agent-executor.js";
import { PlannerAgent } from "./planner/planner.js";
import { CoderAgent } from "./coder/coder.js";
import { ReviewerAgent } from "./reviewer/reviewer.js";

export type AgentRole = "planner" | "coder" | "reviewer";

export interface AgentFactoryOptions {
  executor?: AgentExecutor;
  timeoutMs?: number;
  env?: Record<string, string>;
}

export class AgentFactory {
  private readonly executor: AgentExecutor;

  constructor(options: AgentFactoryOptions = {}) {
    this.executor =
      options.executor ??
      createOpenCodeAgentExecutor({ timeoutMs: options.timeoutMs, env: options.env });
  }

  create(role: AgentRole): Agent {
    switch (role) {
      case "planner":
        return new PlannerAgent(this.executor);
      case "coder":
        return new CoderAgent(this.executor);
      case "reviewer":
        return new ReviewerAgent(this.executor);
      default:
        throw new Error(`Unknown agent role: ${String(role)}`);
    }
  }
}

export function createAgentFactory(options: AgentFactoryOptions = {}): AgentFactory {
  return new AgentFactory(options);
}
