import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import path from "node:path";

const execFileAsync = promisify(execFile);

async function runGit(workspace: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd: workspace,
    timeout: 60_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout.trim();
}

/** Init a git repo in workspace if not already present. */
export async function initRepo(workspace: string): Promise<void> {
  if (existsSync(path.join(workspace, ".git"))) {
    return;
  }
  await runGit(workspace, ["init"]);
}

/** True when `git status --porcelain` reports any change. */
export async function hasChanges(workspace: string): Promise<boolean> {
  const stdout = await runGit(workspace, ["status", "--porcelain"]);
  return stdout.length > 0;
}

/**
 * Stage everything and commit. Returns the new commit hash,
 * or "clean" when there is nothing to commit.
 */
export async function commitAll(workspace: string, message: string): Promise<string> {
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
        message,
      ],
      { cwd: workspace, timeout: 60_000, maxBuffer: 10 * 1024 * 1024 }
    );
  } catch (err) {
    const stderr = (err as { stderr?: string }).stderr ?? "";
    const stdout = (err as { stdout?: string }).stdout ?? "";
    const combined = `${stdout}\n${stderr}`.toLowerCase();
    if (combined.includes("nothing to commit") || combined.includes("clean")) {
      return "clean";
    }
    throw err;
  }
  return runGit(workspace, ["rev-parse", "HEAD"]);
}
