import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function runGit(workspace: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd: workspace,
    timeout: 60_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout.trim();
}

/** Stage everything and commit a named checkpoint. Returns commit hash. */
export async function createCheckpoint(workspace: string, id: string): Promise<string> {
  await runGit(workspace, ["add", "-A"]);
  try {
    await execFileAsync(
      "git",
      [
        "-c",
        "user.name=web-sub-agent",
        "-c",
        "user.email=web-sub-agent@localhost",
        "commit",
        "-m",
        `checkpoint: ${id}`,
      ],
      { cwd: workspace, timeout: 60_000, maxBuffer: 10 * 1024 * 1024 }
    );
  } catch (err) {
    const stderr = (err as { stderr?: string }).stderr ?? "";
    const stdout = (err as { stdout?: string }).stdout ?? "";
    const combined = `${stdout}\n${stderr}`.toLowerCase();
    if (combined.includes("nothing to commit") || combined.includes("clean")) {
      return runGit(workspace, ["rev-parse", "HEAD"]);
    }
    throw err;
  }
  return runGit(workspace, ["rev-parse", "HEAD"]);
}

/** Recent commit log, one line per commit. */
export async function getCheckpointLog(
  workspace: string,
  limit = 20
): Promise<string[]> {
  const stdout = await runGit(workspace, [
    "log",
    `--max-count=${String(limit)}`,
    "--oneline",
  ]);
  if (!stdout) return [];
  return stdout.split("\n").filter((line) => line.trim().length > 0);
}

/** Hard-reset the workspace to a previous checkpoint ref (hash). */
export async function restoreCheckpoint(
  workspace: string,
  ref: string
): Promise<void> {
  if (!/^[A-Za-z0-9_./-]+$/.test(ref)) {
    throw new Error(`Invalid checkpoint ref "${ref}"`);
  }
  await runGit(workspace, ["reset", "--hard", ref]);
}
