import type { PipelineState } from "./pipeline-state.js";

export interface PipelineContext {
  state: PipelineState;
  iteration: number;
  startedAt: string;
  updatedAt: string;
}

export function createPipelineContext(
  initialState: PipelineState = "STARTING",
): PipelineContext {
  const now = new Date().toISOString();
  return { state: initialState, iteration: 0, startedAt: now, updatedAt: now };
}

export function changePipelineState(
  ctx: PipelineContext,
  state: PipelineState,
): PipelineContext {
  return { ...ctx, state, updatedAt: new Date().toISOString() };
}

export function incrementIteration(ctx: PipelineContext): PipelineContext {
  return { ...ctx, iteration: ctx.iteration + 1, updatedAt: new Date().toISOString() };
}
