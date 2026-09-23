export type PipelineState =
  | "STARTING"
  | "ANALYZING"
  | "ENVIRONMENT_SETUP"
  | "PLANNING"
  | "PLAN_VALIDATING"
  | "CODING"
  | "DATABASE_SETUP"
  | "TESTING"
  | "REVIEWING"
  | "DECIDING"
  | "COMPLETED"
  | "FAILED";

export interface PipelineRequest {
  id: string;
  prompt: string;
  workspace: string;
  maxIterations?: number;
}

export type PipelineRunStatus = "COMPLETED" | "FAILED";

export interface PipelineRunResult {
  status: PipelineRunStatus;
  workspace: string;
  durationMs: number;
  failureReason?: string;
}

export interface PipelineContext {
  request: PipelineRequest;
  state: PipelineState;
  iteration: number;
  createdAt: string;
  updatedAt: string;
}
