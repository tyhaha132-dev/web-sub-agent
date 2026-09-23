import { existsSync } from "node:fs";
import { cpSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { AgentService } from "../agents/agent-service.js";
import { isApprovedReview } from "../agents/reviewer/reviewer-contract.js";
import { analyzeProject } from "../project/project-analyzer.js";
import { createManifest } from "../project/project-manifest.js";
import { getBackendDir, getFrontendDir } from "../workspace/workspace-layout.js";
import {
  installBackendDeps,
  installFrontendDeps,
} from "../infrastructure/environment/dependency-manager.js";
import { detectBackend, detectFrontend } from "../project/framework-detector.js";
import { detectPackageManager } from "../project/package-manager-detector.js";
import { validateManifest } from "../project/project-validator.js";
import { buildAcceptanceCriteria } from "../planner/acceptance-criteria.js";
import { createPlanValidator, type PlanValidator } from "../planner/plan-validator.js";
import type { PlanResult } from "../planner/plan-schema.js";
import type { PipelineState } from "./pipeline-state.js";
import { transition } from "./transitions.js";
import { createIterationManager, type IterationManager } from "./iteration-manager.js";
import { PipelineError } from "./pipeline-error.js";
import {
  updateExecutionContext,
  type DatabaseSetupResult,
  type PipelineDecision,
  type PipelineExecutionContext,
  type TestExecutionResult,
} from "./pipeline-execution-context.js";

export interface PipelineObserver {
  onLog?(message: string): void;
  onStepStart?(stepName: string, ctx: PipelineExecutionContext): void;
  onStepComplete?(stepName: string, ctx: PipelineExecutionContext): void;
}

export interface PipelineStep {
  readonly name: string;
  readonly from: PipelineState;
  readonly to: PipelineState;
  run(ctx: PipelineExecutionContext): Promise<PipelineExecutionContext>;
}

export type PipelineStepRunner = (
  step: PipelineStep,
  ctx: PipelineExecutionContext,
) => Promise<PipelineExecutionContext>;

export function createPipelineStepRunner(observer?: PipelineObserver): PipelineStepRunner {
  return async (step, ctx) => {
    observer?.onStepStart?.(step.name, ctx);
    observer?.onLog?.(`[pipeline] starting step ${step.name} (state=${ctx.state})`);
    const next = await step.run(ctx);
    observer?.onStepComplete?.(step.name, next);
    observer?.onLog?.(`[pipeline] finished step ${step.name} (state=${next.state})`);
    return next;
  };
}

export interface DatabaseManager {
  setup(workspace: string): Promise<DatabaseSetupResult>;
}

export interface TestingService {
  runTests(workspace: string): Promise<TestExecutionResult>;
}

export interface PipelineStepsOptions {
  agentService?: AgentService;
  planValidator?: PlanValidator;
  databaseManager?: DatabaseManager;
  testingService?: TestingService;
  iterationManager?: IterationManager;
  observer?: PipelineObserver;
}

abstract class BaseStep implements PipelineStep {
  abstract readonly name: string;
  abstract readonly from: PipelineState;
  abstract readonly to: PipelineState;

  constructor(protected readonly observer?: PipelineObserver) {}

  protected log(message: string): void {
    this.observer?.onLog?.(`[${this.name}] ${message}`);
  }

  protected advance(ctx: PipelineExecutionContext): PipelineExecutionContext {
    return updateExecutionContext(ctx, { state: transition(ctx.state, this.to) });
  }

  abstract run(ctx: PipelineExecutionContext): Promise<PipelineExecutionContext>;
}

export class AnalysisStep extends BaseStep {
  readonly name = "analysis";
  readonly from: PipelineState = "STARTING";
  readonly to: PipelineState = "ANALYZING";

  async run(ctx: PipelineExecutionContext): Promise<PipelineExecutionContext> {
    const analysis = analyzeProject(ctx.prompt);
    this.log(`projectType=${analysis.projectType} requirements=${analysis.requirements.length}`);
    return this.advance(updateExecutionContext(ctx, { analysis }));
  }
}

function isMissingAgentBinary(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("opencode binary not found");
}

function copyTemplateIfMissing(templateRel: string, targetDir: string, sentinelRel: string): void {
  if (existsSync(path.join(targetDir, sentinelRel))) {
    return;
  }
  const templateDir = path.resolve(process.cwd(), templateRel);
  if (!existsSync(templateDir)) {
    return;
  }
  mkdirSync(targetDir, { recursive: true });
  cpSync(templateDir, targetDir, { recursive: true, force: false, errorOnExist: false });
}

export class EnvironmentSetupStep extends BaseStep {
  readonly name = "environment-setup";
  readonly from: PipelineState = "ANALYZING";
  readonly to: PipelineState = "ENVIRONMENT_SETUP";

  async run(ctx: PipelineExecutionContext): Promise<PipelineExecutionContext> {
    mkdirSync(ctx.workspace, { recursive: true });
    const frontendDir = getFrontendDir(ctx.workspace);
    const backendDir = getBackendDir(ctx.workspace);
    copyTemplateIfMissing("templates/frontend", frontendDir, "package.json");
    copyTemplateIfMissing("templates/backend", backendDir, path.join("app", "main.py"));
    this.log("installing frontend + backend dependencies");
    try {
      const fe = await installFrontendDeps(frontendDir);
      const be = await installBackendDeps(backendDir);
      this.log(`deps installed frontend skipped=${fe.skipped} backend skipped=${be.skipped}`);
    } catch (err) {
      throw new PipelineError(
        "STEP_FAILED",
        `Dependency install failed: ${err instanceof Error ? err.message : String(err)}`,
        ctx.state,
      );
    }
    const frontend = detectFrontend(existsSync(frontendDir) ? frontendDir : ctx.workspace);
    const backend = detectBackend(existsSync(backendDir) ? backendDir : ctx.workspace);
    const packageManager = detectPackageManager(ctx.workspace);
    this.log(`frontend=${frontend} backend=${backend} packageManager=${packageManager}`);
    const manifest = await createManifest(ctx.workspace, {
      frontend: frontend === "unknown" ? "nextjs" : frontend,
      backend: backend === "unknown" ? "fastapi" : backend,
      database: "postgres",
    });
    const validation = validateManifest(manifest);
    if (!validation.valid) {
      throw new PipelineError(
        "VALIDATION_FAILED",
        `Invalid project manifest: ${validation.errors.join("; ")}`,
        ctx.state,
      );
    }
    return this.advance(updateExecutionContext(ctx, { environment: { frontend, backend, packageManager } }));
  }
}

function buildFallbackPlan(prompt: string): string {
  const criteria = buildAcceptanceCriteria(prompt)
    .map((c) => `- ${c}`)
    .join("\n");
  return [
    "Fallback plan (no planner agent configured).",
    "Target stack: Next.js (frontend) + FastAPI (backend) + PostgreSQL (database).",
    "1. Scaffold the Next.js frontend and FastAPI backend in the workspace.",
    "2. Define the PostgreSQL schema and wire database connectivity.",
    "3. Implement the requested features:",
    prompt,
    "Acceptance criteria:",
    criteria,
  ].join("\n");
}

export class PlanningStep extends BaseStep {
  readonly name = "planning";
  readonly from: PipelineState = "ENVIRONMENT_SETUP";
  readonly to: PipelineState = "PLANNING";

  constructor(
    private readonly agentService: AgentService | undefined,
    observer?: PipelineObserver,
  ) {
    super(observer);
  }

  async run(ctx: PipelineExecutionContext): Promise<PipelineExecutionContext> {
    let planText: string;
    if (this.agentService) {
      try {
        const result = await this.agentService.run("planner", {
          prompt: ctx.prompt,
          workspace: ctx.workspace,
        });
        if (result.status !== "SUCCESS") {
          throw new PipelineError("STEP_FAILED", result.error ?? "Planner agent failed", ctx.state);
        }
        planText = result.output;
      } catch (err) {
        if (!isMissingAgentBinary(err)) {
          throw err;
        }
        this.log("planner agent unavailable, using fallback plan");
        planText = buildFallbackPlan(ctx.prompt);
      }
    } else {
      this.log("no agent service configured, using fallback plan");
      planText = buildFallbackPlan(ctx.prompt);
    }
    const plan: PlanResult = {
      prompt: ctx.prompt,
      plan: planText,
      plannedAt: new Date().toISOString(),
    };
    return this.advance(updateExecutionContext(ctx, { plan }));
  }
}

export class PlanValidationStep extends BaseStep {
  readonly name = "plan-validation";
  readonly from: PipelineState = "PLANNING";
  readonly to: PipelineState = "PLAN_VALIDATING";

  constructor(
    private readonly planValidator: PlanValidator,
    observer?: PipelineObserver,
  ) {
    super(observer);
  }

  async run(ctx: PipelineExecutionContext): Promise<PipelineExecutionContext> {
    if (!ctx.plan) {
      throw new PipelineError("STEP_FAILED", "No plan available to validate", ctx.state);
    }
    const validation = this.planValidator.validate(ctx.plan);
    if (!validation.valid) {
      throw new PipelineError(
        "VALIDATION_FAILED",
        `Plan validation failed: ${validation.errors.join("; ")}`,
        ctx.state,
      );
    }
    this.log("plan is valid");
    return this.advance(ctx);
  }
}

export class CodingStep extends BaseStep {
  readonly name = "coding";
  readonly from: PipelineState = "PLAN_VALIDATING";
  readonly to: PipelineState = "CODING";

  constructor(
    private readonly agentService: AgentService | undefined,
    observer?: PipelineObserver,
  ) {
    super(observer);
  }

  async run(ctx: PipelineExecutionContext): Promise<PipelineExecutionContext> {
    if (!ctx.plan) {
      throw new PipelineError("STEP_FAILED", "No plan available for coding", ctx.state);
    }
    if (this.agentService) {
      try {
        const result = await this.agentService.run("coder", {
          prompt: ctx.plan.plan,
          workspace: ctx.workspace,
          context: { plan: ctx.plan.plan, requirements: ctx.analysis?.requirements ?? [] },
        });
        if (result.status !== "SUCCESS") {
          throw new PipelineError("STEP_FAILED", result.error ?? "Coder agent failed", ctx.state);
        }
        return this.advance(
          updateExecutionContext(ctx, { codingResult: { success: true, output: result.output } }),
        );
      } catch (err) {
        if (!isMissingAgentBinary(err)) {
          throw err;
        }
        this.log("coder agent unavailable, keeping workspace code as-is");
      }
    }
    this.log("no agent service configured, skipping AI coding");
    return this.advance(
      updateExecutionContext(ctx, {
        codingResult: { success: true, output: "Coding skipped (no agent service configured)" },
      }),
    );
  }
}

export class DatabaseSetupStep extends BaseStep {
  readonly name = "database-setup";
  readonly from: PipelineState = "CODING";
  readonly to: PipelineState = "DATABASE_SETUP";

  constructor(
    private readonly databaseManager: DatabaseManager | undefined,
    observer?: PipelineObserver,
  ) {
    super(observer);
  }

  async run(ctx: PipelineExecutionContext): Promise<PipelineExecutionContext> {
    if (this.databaseManager) {
      const databaseResult = await this.databaseManager.setup(ctx.workspace);
      if (!databaseResult.success) {
        throw new PipelineError(
          "STEP_FAILED",
          `Database setup failed: ${databaseResult.message}`,
          ctx.state,
        );
      }
      return this.advance(updateExecutionContext(ctx, { databaseResult }));
    }
    this.log("no database manager configured, assuming database is ready");
    return this.advance(
      updateExecutionContext(ctx, {
        databaseResult: { success: true, message: "Database setup skipped (no manager configured)" },
      }),
    );
  }
}

export class TestingStep extends BaseStep {
  readonly name = "testing";
  readonly from: PipelineState = "DATABASE_SETUP";
  readonly to: PipelineState = "TESTING";

  constructor(
    private readonly testingService: TestingService | undefined,
    observer?: PipelineObserver,
  ) {
    super(observer);
  }

  async run(ctx: PipelineExecutionContext): Promise<PipelineExecutionContext> {
    if (this.testingService) {
      const testResult = await this.testingService.runTests(ctx.workspace);
      if (!testResult.success) {
        throw new PipelineError(
          "STEP_FAILED",
          `Tests failed: ${testResult.output}`,
          ctx.state,
        );
      }
      return this.advance(updateExecutionContext(ctx, { testResult }));
    }
    this.log("no testing service configured, assuming tests pass");
    return this.advance(
      updateExecutionContext(ctx, {
        testResult: { success: true, output: "Tests skipped (no testing service configured)" },
      }),
    );
  }
}

export class ReviewingStep extends BaseStep {
  readonly name = "reviewing";
  readonly from: PipelineState = "TESTING";
  readonly to: PipelineState = "REVIEWING";

  constructor(
    private readonly agentService: AgentService | undefined,
    observer?: PipelineObserver,
  ) {
    super(observer);
  }

  async run(ctx: PipelineExecutionContext): Promise<PipelineExecutionContext> {
    const diff = ctx.codingResult?.output ?? "";
    const testResults = ctx.testResult?.output ?? "";
    if (this.agentService) {
      try {
        const result = await this.agentService.run("reviewer", {
          prompt: diff,
          workspace: ctx.workspace,
          context: { diff, testResults },
        });
        if (result.status !== "SUCCESS") {
          throw new PipelineError(
            "STEP_FAILED",
            result.error ?? "Reviewer agent failed",
            ctx.state,
          );
        }
        const approved = isApprovedReview(result.output);
        this.log(approved ? "review approved" : "review requested changes");
        return this.advance(
          updateExecutionContext(ctx, { reviewResult: { approved, feedback: result.output } }),
        );
      } catch (err) {
        if (!isMissingAgentBinary(err)) {
          throw err;
        }
        this.log("reviewer agent unavailable, defaulting to test-based approval");
      }
    }
    const approved = ctx.testResult?.success ?? false;
    this.log(`no agent service configured, defaulting review to approved=${approved}`);
    return this.advance(
      updateExecutionContext(ctx, {
        reviewResult: { approved, feedback: "Review skipped (no agent service configured)" },
      }),
    );
  }
}

export class DecidingStep extends BaseStep {
  readonly name = "deciding";
  readonly from: PipelineState = "REVIEWING";
  readonly to: PipelineState = "DECIDING";

  constructor(
    private readonly iterationManager: IterationManager,
    observer?: PipelineObserver,
  ) {
    super(observer);
  }

  async run(ctx: PipelineExecutionContext): Promise<PipelineExecutionContext> {
    const approved = ctx.reviewResult?.approved ?? false;
    const testsPass = ctx.testResult?.success ?? false;
    let decision: PipelineDecision = "fail";
    if (approved && testsPass) {
      decision = "approve";
    } else if (this.iterationManager.canContinue()) {
      decision = "retry";
    }
    this.log(`decision=${decision} approved=${approved} testsPass=${testsPass}`);
    if (decision === "fail") {
      return this.advance(
        updateExecutionContext(ctx, {
          decision,
          failureReason: "Pipeline rejected at decision step (review or tests did not pass)",
        }),
      );
    }
    return this.advance(updateExecutionContext(ctx, { decision }));
  }
}

export class StateTransitionStep extends BaseStep {
  readonly name: string;
  readonly from: PipelineState;
  readonly to: PipelineState;

  constructor(from: PipelineState, to: PipelineState, observer?: PipelineObserver) {
    super(observer);
    this.name = `transition:${from}->${to}`;
    this.from = from;
    this.to = to;
  }

  async run(ctx: PipelineExecutionContext): Promise<PipelineExecutionContext> {
    return this.advance(ctx);
  }
}

export function createPipelineStateSteps(options: PipelineStepsOptions = {}): PipelineStep[] {
  const planValidator = options.planValidator ?? createPlanValidator();
  const iterationManager =
    options.iterationManager ?? createIterationManager({ maxIterations: 3 });
  const observer = options.observer;
  return [
    new AnalysisStep(observer),
    new EnvironmentSetupStep(observer),
    new PlanningStep(options.agentService, observer),
    new PlanValidationStep(planValidator, observer),
    new CodingStep(options.agentService, observer),
    new DatabaseSetupStep(options.databaseManager, observer),
    new TestingStep(options.testingService, observer),
    new ReviewingStep(options.agentService, observer),
    new DecidingStep(iterationManager, observer),
  ];
}
