import type { ProjectAnalysis } from "../project/project-analyzer.js";
import type { PlanResult } from "../planner/plan-schema.js";
import type { PipelineContext } from "./pipeline-context.js";

export interface CodingResult {
  success: boolean;
  output: string;
}

export interface DatabaseSetupResult {
  success: boolean;
  message: string;
}

export interface TestExecutionResult {
  success: boolean;
  output: string;
}

export interface ReviewExecutionResult {
  approved: boolean;
  feedback: string;
}

export type PipelineDecision = "approve" | "retry" | "fail";

export interface PipelineExecutionContext extends PipelineContext {
  workspace: string;
  prompt: string;
  environment?: {
    frontend: string;
    backend: string;
    packageManager: string;
  };
  analysis?: ProjectAnalysis;
  plan?: PlanResult;
  codingResult?: CodingResult;
  databaseResult?: DatabaseSetupResult;
  testResult?: TestExecutionResult;
  reviewResult?: ReviewExecutionResult;
  decision?: PipelineDecision;
  failureReason?: string;
}

export function createPipelineExecutionContext(
  workspace: string,
  prompt = "",
): PipelineExecutionContext {
  const now = new Date().toISOString();
  return {
    state: "STARTING",
    iteration: 0,
    startedAt: now,
    updatedAt: now,
    workspace,
    prompt,
  };
}

export function updateExecutionContext(
  ctx: PipelineExecutionContext,
  patch: Partial<Omit<PipelineExecutionContext, "workspace">>,
): PipelineExecutionContext {
  return { ...ctx, ...patch, updatedAt: new Date().toISOString() };
}

export function failExecutionContext(
  ctx: PipelineExecutionContext,
  failureReason: string,
): PipelineExecutionContext {
  return updateExecutionContext(ctx, { state: "FAILED", failureReason });
}
