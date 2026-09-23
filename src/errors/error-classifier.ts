import { ERROR_CODES, type ErrorCode } from "./error-codes.js";
import { PipelineError } from "./pipeline-error.js";

function messageOf(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`.toLowerCase();
  return String(error).toLowerCase();
}

export function classifyError(error: unknown): ErrorCode {
  if (error instanceof PipelineError) return error.code;
  const msg = messageOf(error);
  if (msg.includes("timed out") || msg.includes("timeout") || msg.includes("etimedout") || msg.includes("abort")) {
    return ERROR_CODES.TIMEOUT;
  }
  if (
    msg.includes("database") || msg.includes("postgres") || msg.includes("pg_") ||
    msg.includes("econnrefused") || msg.includes("53328") || msg.includes("3d000")
  ) {
    return ERROR_CODES.DATABASE_FAILURE;
  }
  if (msg.includes("plan invalid") || msg.includes("invalid plan") || msg.includes("plan validation") || msg.includes("schema")) {
    return ERROR_CODES.PLAN_INVALID;
  }
  if (msg.includes("build failed") || msg.includes("tsc") || msg.includes("next build") || msg.includes("vite")) {
    return ERROR_CODES.BUILD_FAILURE;
  }
  if (
    msg.includes("test failed") || msg.includes("jest") || msg.includes("vitest") ||
    msg.includes("pytest") || msg.includes("assertion") || msg.includes("failing test")
  ) {
    return ERROR_CODES.TEST_FAILURE;
  }
  if (msg.includes("model") || msg.includes("401") || msg.includes("429") || msg.includes("api key") || msg.includes("overloaded")) {
    return ERROR_CODES.MODEL_ERROR;
  }
  return ERROR_CODES.PROCESS_ERROR;
}
