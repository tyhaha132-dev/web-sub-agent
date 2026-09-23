export type PipelineErrorCode =
  | "INVALID_TRANSITION"
  | "MAX_ITERATIONS"
  | "STEP_FAILED"
  | "VALIDATION_FAILED";

export class PipelineError extends Error {
  readonly code: PipelineErrorCode;
  readonly state?: string;

  constructor(code: PipelineErrorCode, message: string, state?: string) {
    super(message);
    this.name = "PipelineError";
    this.code = code;
    this.state = state;
  }
}
