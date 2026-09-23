import { createLogger, type Logger } from "./logger.js";

export interface PipelineLogger {
  logger: Logger;
  pipelineId: string;
  onStart(input: string): void;
  onStateChange(from: string, to: string): void;
  onComplete(result: string): void;
  onFailure(error: string): void;
}

export function createPipelineLogger(pipelineId: string, base?: Logger): PipelineLogger {
  const logger = base ?? createLogger(`pipeline:${pipelineId}`);
  return {
    logger,
    pipelineId,
    onStart: (input) => logger.info(`start pipeline=${pipelineId} input=${input}`),
    onStateChange: (from, to) => logger.info(`state pipeline=${pipelineId} ${from} -> ${to}`),
    onComplete: (result) => logger.info(`complete pipeline=${pipelineId} result=${result}`),
    onFailure: (error) => logger.error(`failure pipeline=${pipelineId} error=${error}`),
  };
}
