import { promises as fs } from "node:fs";
import { getWorkspaceDirectory } from "./workspace-manager.js";

/** Remove a workspace directory recursively. Idempotent. */
export async function cleanWorkspace(pipelineId: string): Promise<void> {
  const dir = getWorkspaceDirectory(pipelineId);
  await fs.rm(dir, { recursive: true, force: true });
}
