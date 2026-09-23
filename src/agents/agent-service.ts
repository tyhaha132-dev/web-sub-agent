import type { AgentInput } from "./agent-contract.js";
import type { AgentResult } from "./agent-result.js";
import { runAgent } from "./agent-runner.js";
import { AgentFactory, type AgentRole } from "./agent-factory.js";

export class AgentService {
  constructor(private readonly factory: AgentFactory) {}

  run(role: AgentRole, input: AgentInput): Promise<AgentResult> {
    return runAgent(this.factory.create(role), input);
  }
}

export function createAgentService(factory: AgentFactory): AgentService {
  return new AgentService(factory);
}
