import { promises as fs } from "node:fs";
import {
  checkNode,
  checkPython,
  type EnvCheckResult,
} from "./environment-check.js";
import {
  getBackendDir,
  getDocsDir,
  getFrontendDir,
} from "../../workspace/workspace-layout.js";

export interface EnvironmentSetupResult {
  node: EnvCheckResult;
  python: EnvCheckResult;
  frontendDir: string;
  backendDir: string;
  docsDir: string;
}

/**
 * Verify node/python toolchains and ensure workspace subdirectories exist.
 * Does not throw when a toolchain is missing; reports it in the result.
 */
export async function setupEnvironment(
  workspace: string
): Promise<EnvironmentSetupResult> {
  const frontendDir = getFrontendDir(workspace);
  const backendDir = getBackendDir(workspace);
  const docsDir = getDocsDir(workspace);

  await fs.mkdir(frontendDir, { recursive: true });
  await fs.mkdir(backendDir, { recursive: true });
  await fs.mkdir(docsDir, { recursive: true });

  const [node, python] = await Promise.all([checkNode(), checkPython()]);

  return { node, python, frontendDir, backendDir, docsDir };
}
