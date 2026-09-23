import type { PipelineRequest, PipelineRunResult } from "../contracts.js";
import type { PipelineOrchestrator } from "./orchestrator.js";
import {
  createPipelineExecutionContext,
  updateExecutionContext,
  type PipelineExecutionContext,
} from "./pipeline-execution-context.js";
import { createIterationManager, type IterationManager } from "./iteration-manager.js";
import {
  createPipelineStateSteps,
  createPipelineStepRunner,
  type PipelineObserver,
  type PipelineStep,
  type PipelineStepRunner,
  type PipelineStepsOptions,
} from "./steps.js";
import { transition } from "./transitions.js";

export interface DefaultPipelineOrchestratorOptions {
  steps?: PipelineStep[];
  stepRunner?: PipelineStepRunner;
  observer?: PipelineObserver;
  maxIterations?: number;
  stepOptions?: PipelineStepsOptions;
  iterationManager?: IterationManager;
}

const RETRY_ENTRY_STATE = "CODING";

function findRetryStartIndex(steps: PipelineStep[]): number {
  const index = steps.findIndex((step) => step.to === RETRY_ENTRY_STATE);
  return index >= 0 ? index : 0;
}

export class DefaultPipelineOrchestrator implements PipelineOrchestrator {
  private readonly steps: PipelineStep[];
  private readonly stepRunner: PipelineStepRunner;
  private readonly observer?: PipelineObserver;
  private readonly maxIterations: number;
  private readonly stepOptions?: PipelineStepsOptions;
  private readonly sharedIterationManager?: IterationManager;

  constructor(options: DefaultPipelineOrchestratorOptions = {}) {
    this.steps = options.steps ?? [];
    this.observer = options.observer;
    this.stepRunner = options.stepRunner ?? createPipelineStepRunner(options.observer);
    this.maxIterations = options.maxIterations ?? 3;
    this.stepOptions = options.stepOptions;
    this.sharedIterationManager = options.iterationManager;
  }

  private log(message: string): void {
    this.observer?.onLog?.(message);
  }

  async execute(request: PipelineRequest): Promise<PipelineRunResult> {
    const startedAt = Date.now();
    try {
      const manager =
        this.sharedIterationManager ??
        createIterationManager({ maxIterations: request.maxIterations ?? this.maxIterations });
      const resolveSteps = (): PipelineStep[] => {
        if (this.steps.length > 0) {
          return this.steps;
        }
        return createPipelineStateSteps({
          ...this.stepOptions,
          iterationManager: manager,
          observer: this.observer,
        });
      };

      let ctx = createPipelineExecutionContext(request.workspace, request.prompt);
      let steps = resolveSteps();
      let startIndex = 0;
      let settled = false;
      let result: PipelineRunResult = {
        status: "FAILED",
        workspace: request.workspace,
        durationMs: 0,
        failureReason: "Pipeline did not settle",
      };

      while (!settled) {
        for (let i = startIndex; i < steps.length; i += 1) {
          ctx = await this.stepRunner(steps[i] as PipelineStep, ctx);
        }
        settled = true;
        result = this.settle(ctx, manager, startedAt);
        if (result.status === "FAILED" && this.shouldRetry(ctx, manager)) {
          const iteration = manager.next();
          this.log(`[pipeline] retry requested, starting iteration ${iteration}`);
          ctx = this.resetForRetry(ctx);
          steps = resolveSteps();
          startIndex = findRetryStartIndex(steps);
          settled = false;
        }
      }

      return result;
    } catch (err) {
      const failureReason = err instanceof Error ? err.message : String(err);
      this.log(`[pipeline] failed: ${failureReason}`);
      return {
        status: "FAILED",
        workspace: request.workspace,
        durationMs: Date.now() - startedAt,
        failureReason,
      };
    }
  }

  private settle(
    ctx: PipelineExecutionContext,
    manager: IterationManager,
    startedAt: number,
  ): PipelineRunResult {
    void manager;
    if (ctx.state !== "DECIDING") {
      return {
        status: "FAILED",
        workspace: ctx.workspace,
        durationMs: Date.now() - startedAt,
        failureReason: `Pipeline stopped in unexpected state ${ctx.state}`,
      };
    }
    if (ctx.decision === "approve" || ctx.decision === undefined) {
      const completed = updateExecutionContext(ctx, { state: transition(ctx.state, "COMPLETED") });
      return {
        status: "COMPLETED",
        workspace: completed.workspace,
        durationMs: Date.now() - startedAt,
      };
    }
    if (ctx.decision === "retry") {
      return {
        status: "FAILED",
        workspace: ctx.workspace,
        durationMs: Date.now() - startedAt,
        failureReason: ctx.failureReason ?? "Retry requested but iterations exhausted",
      };
    }
    const failureReason = ctx.failureReason ?? "Pipeline did not reach an approved decision";
    updateExecutionContext(ctx, { state: transition(ctx.state, "FAILED"), failureReason });
    return {
      status: "FAILED",
      workspace: ctx.workspace,
      durationMs: Date.now() - startedAt,
      failureReason,
    };
  }

  private shouldRetry(ctx: PipelineExecutionContext, manager: IterationManager): boolean {
    return ctx.state === "DECIDING" && ctx.decision === "retry" && manager.canContinue();
  }

  private resetForRetry(ctx: PipelineExecutionContext): PipelineExecutionContext {
    return updateExecutionContext(ctx, {
      state: transition(ctx.state, RETRY_ENTRY_STATE),
      iteration: ctx.iteration + 1,
      decision: undefined,
      failureReason: undefined,
    });
  }
}
