export const MODELS = {
  planner: "opencode/nemotron-3-ultra-free",
  coder: "opencode/muse-spark-1.3-contributor-free",
  reviewer: "opencode/mimo-v2.6-flash-free",
} as const;

export type ModelRole = keyof typeof MODELS;
