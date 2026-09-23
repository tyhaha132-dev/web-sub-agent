import "dotenv/config";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { CONFIG } from "./config/config.js";
import { createPipelineOrchestrator } from "./application/create-pipeline.js";

export function getSystemName(): string {
  return "web-sub-agent";
}

function parseArgs(argv: string[]): { prompt: string; id: string } {
  const positional: string[] = [];
  let id = "";
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--id" && i + 1 < argv.length) {
      id = argv[i + 1] ?? "";
      i += 1;
    } else if (!argv[i]?.startsWith("--")) {
      positional.push(argv[i] ?? "");
    }
  }
  const prompt = positional.join(" ").trim();
  if (prompt.length === 0) {
    throw new Error('Usage: npm start -- "<prompt>" [--id <pipeline-id>]');
  }
  if (id.trim().length === 0) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    id = `web-${stamp}`;
  }
  return { prompt, id };
}

async function main(): Promise<void> {
  const { prompt, id } = parseArgs(process.argv);
  const workspace = path.resolve(process.cwd(), "workspaces", id);
  console.log(`[${getSystemName()}] id=${id}`);
  console.log(`[${getSystemName()}] workspace=${workspace}`);
  const orchestrator = createPipelineOrchestrator({
    maxIterations: CONFIG.pipelineMaxIterations,
    timeoutMs: CONFIG.processTimeoutMs,
  });
  const result = await orchestrator.execute({ id, prompt, workspace });
  console.log(`[${getSystemName()}] status=${result.status} durationMs=${result.durationMs}`);
  if (result.status === "FAILED") {
    console.error(result.failureReason ?? "pipeline failed");
    process.exitCode = 1;
    return;
  }
  console.log(`frontend: ${path.join(workspace, "frontend")}`);
  console.log(`backend: ${path.join(workspace, "backend")}`);
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });
}
