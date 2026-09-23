import type { AgentInput } from "../agent-contract.js";

export interface ReviewerInput {
  diff: string;
  testResults: string;
}

export function buildReviewPrompt(input: ReviewerInput): string {
  return [
    "You are a strict senior code reviewer.",
    "Target stack: Next.js (frontend) + FastAPI (backend) + PostgreSQL (database).",
    'Review the change below and reply with exactly one verdict line, either "APPROVE" or "REQUEST_CHANGES", followed by concrete feedback.',
    "Changed files / diff:",
    input.diff.length > 0 ? input.diff : "(no diff provided)",
    "Test results:",
    input.testResults.length > 0 ? input.testResults : "(no test results provided)",
  ].join("\n");
}

export function toAgentInput(workspace: string, input: ReviewerInput): AgentInput {
  return {
    prompt: buildReviewPrompt(input),
    workspace,
    context: { diff: input.diff, testResults: input.testResults },
  };
}

export function isApprovedReview(output: string): boolean {
  return output.toUpperCase().includes("APPROVE");
}
