import path from "node:path";
import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";

const WORKSPACES_DIR_NAME = "workspaces";

/** Matches safe pipeline ids. Anything else is rejected to prevent path traversal. */
const SAFE_PIPELINE_ID = /^[A-Za-z0-9_-]+$/;

export function getWorkspaceRoot(): string {
  return path.resolve(process.cwd(), WORKSPACES_DIR_NAME);
}

function assertSafePipelineId(pipelineId: string): void {
  if (!pipelineId || !SAFE_PIPELINE_ID.test(pipelineId)) {
    throw new Error(
      `Invalid pipelineId "${pipelineId}". Must match ${String(SAFE_PIPELINE_ID)}`
    );
  }
}

/**
 * Resolve the absolute workspace directory for a pipeline.
 * Throws on path traversal attempts.
 */
export function getWorkspaceDirectory(pipelineId: string): string {
  assertSafePipelineId(pipelineId);
  const root = getWorkspaceRoot();
  const resolved = path.resolve(root, pipelineId);
  const relative = path.relative(root, resolved);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path traversal detected for pipelineId "${pipelineId}"`);
  }
  return resolved;
}

/** Create the workspace directory (recursive). Returns the absolute path. */
export async function createWorkspace(pipelineId: string): Promise<string> {
  const dir = getWorkspaceDirectory(pipelineId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Check whether a workspace directory exists.
 * Sync boolean so callers can `await` it as well.
 */
export function workspaceExists(pipelineId: string): boolean {
  const dir = getWorkspaceDirectory(pipelineId);
  return existsSync(dir);
}
