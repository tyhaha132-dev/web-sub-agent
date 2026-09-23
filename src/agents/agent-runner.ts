import type { Agent, AgentInput } from "./agent-contract.js";
import { failureResult, type AgentResult } from "./agent-result.js";

export async function runAgent(agent: Agent, input: AgentInput): Promise<AgentResult> {
  try {
    return await agent.execute(input);
  } catch (err) {
    return failureResult(err instanceof Error ? err.message : String(err));
  }
}
