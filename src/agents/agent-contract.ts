import type { AgentResult } from "./agent-result.js";

export interface AgentInput {
  prompt: string;
  workspace: string;
  context?: Record<string, unknown>;
}

export interface Agent {
  role: string;
  name: string;
  model: string;
  execute(input: AgentInput): Promise<AgentResult>;
}
