import { PipelineError } from "./pipeline-error.js";

export interface IterationManagerOptions {
  maxIterations: number;
}

export interface IterationManager {
  getCurrent(): number;
  canContinue(): boolean;
  next(): number;
  assertCanContinue(): void;
}

export function createIterationManager(options: IterationManagerOptions): IterationManager {
  let current = 0;
  return {
    getCurrent(): number {
      return current;
    },
    canContinue(): boolean {
      return current < options.maxIterations;
    },
    next(): number {
      if (current >= options.maxIterations) {
        throw new PipelineError(
          "MAX_ITERATIONS",
          `Maximum iterations (${options.maxIterations}) exceeded`,
        );
      }
      current += 1;
      return current;
    },
    assertCanContinue(): void {
      if (current >= options.maxIterations) {
        throw new PipelineError(
          "MAX_ITERATIONS",
          `Maximum iterations (${options.maxIterations}) exceeded`,
        );
      }
    },
  };
}
