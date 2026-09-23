import { AgentFactory } from "../agents/agent-factory.js";
import { AgentService } from "../agents/agent-service.js";
import { createOpenCodeAgentExecutor } from "../agents/agent-executor.js";
import {
  DefaultPipelineOrchestrator,
  type DefaultPipelineOrchestratorOptions,
} from "../orchestrator/default-orchestrator.js";
import {
  createPipelineStateSteps,
  type DatabaseManager,
  type PipelineObserver,
  type TestingService,
} from "../orchestrator/steps.js";
import type {
  DatabaseSetupResult,
  TestExecutionResult,
} from "../orchestrator/pipeline-execution-context.js";
import { createPlanValidator } from "../planner/plan-validator.js";
import {
  checkPostgresHealth,
  getDefaultDatabaseConfig,
} from "../infrastructure/database/database-health.js";
import { ensureDatabase } from "../infrastructure/database/postgres-manager.js";
import { runMigrations } from "../infrastructure/database/migration-manager.js";
import { seedDemoData } from "../infrastructure/database/seed-manager.js";
import { checkBuild } from "../tester/checks/build-check.js";
import { checkDatabase } from "../tester/checks/database-check.js";

export interface CreatePipelineOptions {
  timeoutMs?: number;
  env?: Record<string, string>;
  maxIterations?: number;
  observer?: PipelineObserver;
  databaseManager?: DatabaseManager;
  testingService?: TestingService;
}

class PostgresDatabaseManager implements DatabaseManager {
  async setup(workspace: string): Promise<DatabaseSetupResult> {
    const config = getDefaultDatabaseConfig();
    await ensureDatabase(config);
    const health = await checkPostgresHealth(config);
    if (!health.healthy) {
      return {
        success: false,
        message: `Postgres mandatory but unreachable: ${health.error ?? "unknown"}`,
      };
    }
    const migrations = await runMigrations(workspace, config);
    const seed = await seedDemoData(config);
    return {
      success: true,
      message: `db up (${health.durationMs}ms), migrations applied=${migrations.applied} skipped=${migrations.skipped}, seed=${seed.seeded ? "inserted" : "exists"} items=${seed.items}`,
    };
  }
}

class RealTestingService implements TestingService {
  async runTests(workspace: string): Promise<TestExecutionResult> {
    const build = await checkBuild(workspace);
    const database = await checkDatabase(workspace);
    const failed = [build, database].filter((r) => r.status === "failed");
    const output = [build, database]
      .map((r) => `${r.name}:${r.status}:${r.message}`)
      .join(" | ");
    if (failed.length > 0) {
      return { success: false, output };
    }
    return { success: true, output };
  }
}

export function createDatabaseManager(): DatabaseManager {
  return new PostgresDatabaseManager();
}

export function createTestingService(): TestingService {
  return new RealTestingService();
}

export function createPipelineOrchestrator(
  options: CreatePipelineOptions = {},
): DefaultPipelineOrchestrator {
  const executor = createOpenCodeAgentExecutor({
    timeoutMs: options.timeoutMs,
    env: options.env,
  });
  const factory = new AgentFactory({ executor });
  const agentService = new AgentService(factory);
  const planValidator = createPlanValidator();
  const databaseManager = options.databaseManager ?? createDatabaseManager();
  const testingService = options.testingService ?? createTestingService();
  const observer: PipelineObserver =
    options.observer ??
    ({
      onLog: (message: string): void => {
        console.log(message);
      },
    } satisfies PipelineObserver);
  const steps = createPipelineStateSteps({
    agentService,
    planValidator,
    databaseManager,
    testingService,
    observer,
  });
  const orchestratorOptions: DefaultPipelineOrchestratorOptions = {
    steps,
    observer,
    maxIterations: options.maxIterations ?? 3,
  };
  return new DefaultPipelineOrchestrator(orchestratorOptions);
}
