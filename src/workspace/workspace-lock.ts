import path from "node:path";
import { promises as fs } from "node:fs";
import { getWorkspaceDirectory } from "./workspace-manager.js";

export function getLockPath(pipelineIdOrWorkspace: string): string {
  let workspace: string;
  try {
    workspace = getWorkspaceDirectory(pipelineIdOrWorkspace);
  } catch {
    // Caller passed an absolute workspace path directly.
    workspace = pipelineIdOrWorkspace;
  }
  return path.join(workspace, ".lock");
}

/**
 * Acquire an exclusive workspace lock using mkdir (atomic on POSIX/Windows).
 * Throws EEXIST-style error if already locked.
 */
export async function acquireWorkspaceLock(pipelineId: string): Promise<string> {
  const lockPath = getLockPath(pipelineId);
  // Ensure parent workspace exists so mkdir error semantics stay clear.
  await fs.mkdir(path.dirname(lockPath), { recursive: true });
  try {
    await fs.mkdir(lockPath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EEXIST") {
      throw new Error(`Workspace "${pipelineId}" is already locked (${lockPath})`);
    }
    throw err;
  }
  // Best-effort owner marker, ignore failures.
  try {
    await fs.writeFile(path.join(lockPath, "pid"), String(process.pid), "utf-8");
  } catch {
    // ignore
  }
  return lockPath;
}

/** Release a lock acquired with acquireWorkspaceLock. Idempotent. */
export async function releaseWorkspaceLock(pipelineId: string): Promise<void> {
  const lockPath = getLockPath(pipelineId);
  await fs.rm(lockPath, { recursive: true, force: true });
}
