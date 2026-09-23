import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Raw output of `git status --porcelain` (empty string = clean). */
export async function getStatus(workspace: string): Promise<string> {
  const { stdout } = await execFileAsync("git", ["status", "--porcelain"], {
    cwd: workspace,
    timeout: 60_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}
