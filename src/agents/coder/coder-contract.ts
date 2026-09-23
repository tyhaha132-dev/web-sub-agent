import type { AgentInput } from "../agent-contract.js";

export interface CoderInput {
  plan: string;
  requirements: string[];
}

export function buildCoderPrompt(input: CoderInput): string {
  const requirements =
    input.requirements.length > 0
      ? input.requirements.map((r, i) => `${i + 1}. ${r}`).join("\n")
      : "(no additional requirements)";
  return [
    "You are a senior full-stack engineer.",
    "Target stack: Next.js (frontend) + FastAPI (backend) + PostgreSQL (database).",
    "Implement the following plan inside the given workspace. Modify files directly.",
    "Implementation plan:",
    input.plan,
    "Requirements:",
    requirements,
    "Reply with a short summary of the files you created or changed.",
  ].join("\n");
}

export function toAgentInput(workspace: string, input: CoderInput): AgentInput {
  return {
    prompt: buildCoderPrompt(input),
    workspace,
    context: { plan: input.plan, requirements: input.requirements },
  };
}
