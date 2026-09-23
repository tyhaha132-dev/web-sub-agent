export type AgentRole = "planner" | "coder" | "reviewer";

export interface AgentInput {
  pipelineId: string;
  prompt: string;
  workspace: string;
}

export interface AgentOutput {
  output: string;
}
