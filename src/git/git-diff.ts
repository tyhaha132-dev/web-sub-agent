import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Output of `git diff --stat` (empty string = no unstaged diff). */
export async function getDiff(workspace: string): Promise<string> {
  const { stdout } = await execFileAsync("git", ["diff", "--stat"], {
    cwd: workspace,
    timeout: 60_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}
