import type { PipelineState } from "./pipeline-state.js";

export const PIPELINE_FLOW: readonly PipelineState[] = [
  "STARTING",
  "ANALYZING",
  "ENVIRONMENT_SETUP",
  "PLANNING",
  "PLAN_VALIDATING",
  "CODING",
  "DATABASE_SETUP",
  "TESTING",
  "REVIEWING",
  "DECIDING",
];
