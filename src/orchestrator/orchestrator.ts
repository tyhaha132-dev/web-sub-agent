import type { PipelineRequest, PipelineRunResult } from "../contracts.js";

export type { PipelineRequest, PipelineRunResult };

export interface PipelineOrchestrator {
  execute(request: PipelineRequest): Promise<PipelineRunResult>;
}
