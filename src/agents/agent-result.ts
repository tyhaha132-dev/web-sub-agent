export type AgentStatus = "SUCCESS" | "FAILED";

export interface AgentResult {
  status: AgentStatus;
  output: string;
  error?: string;
}

export function successResult(output: string): AgentResult {
  return { status: "SUCCESS", output };
}

export function failureResult(error: string): AgentResult {
  return { status: "FAILED", output: "", error };
}
