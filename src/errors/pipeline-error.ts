import type { ErrorCode } from "./error-codes.js";

export class PipelineError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PipelineError";
    this.code = code;
  }
}
