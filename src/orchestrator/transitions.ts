import type { PipelineState } from "./pipeline-state.js";
import { PipelineError } from "./pipeline-error.js";

export const TRANSITIONS: Record<PipelineState, readonly PipelineState[]> = {
  STARTING: ["ANALYZING", "FAILED"],
  ANALYZING: ["ENVIRONMENT_SETUP", "FAILED"],
  ENVIRONMENT_SETUP: ["PLANNING", "FAILED"],
  PLANNING: ["PLAN_VALIDATING", "FAILED"],
  PLAN_VALIDATING: ["CODING", "PLANNING", "FAILED"],
  CODING: ["DATABASE_SETUP", "CODING", "FAILED"],
  DATABASE_SETUP: ["TESTING", "CODING", "FAILED"],
  TESTING: ["REVIEWING", "CODING", "TESTING", "FAILED"],
  REVIEWING: ["DECIDING", "CODING", "TESTING", "FAILED"],
  DECIDING: ["COMPLETED", "CODING", "TESTING", "REVIEWING", "FAILED"],
  COMPLETED: [],
  FAILED: [],
};

export function getAllowedTransitions(state: PipelineState): readonly PipelineState[] {
  return TRANSITIONS[state];
}

export function canTransition(from: PipelineState, to: PipelineState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function transition(from: PipelineState, to: PipelineState): PipelineState {
  if (!canTransition(from, to)) {
    throw new PipelineError(
      "INVALID_TRANSITION",
      `Invalid pipeline transition from ${from} to ${to}`,
      from,
    );
  }
  return to;
}
