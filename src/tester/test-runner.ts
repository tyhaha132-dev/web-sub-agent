import { spawn } from 'node:child_process';
import type { CheckResult, ProcessResult } from './test-result.js';
import { createTestResult } from './test-result.js';

export interface RunTestCommandOptions {
  command: string;
  args?: string[];
  timeoutMs?: number;
  name?: string;
  env?: Record<string, string>;
}

function resolveCommand(command: string): string {
  if (process.platform === 'win32' && (command === 'npm' || command === 'npx')) {
    return `${command}.cmd`;
  }
  return command;
}

export function runProcess(
  workspace: string,
  command: string,
  args: string[] = [],
  timeoutMs = 600000,
  env?: Record<string, string>,
): Promise<ProcessResult> {
  const started = Date.now();
  return new Promise((resolve) => {
    const child = spawn(resolveCommand(command), args, {
      cwd: workspace,
      env: env !== undefined ? { ...process.env, ...env } : process.env,
      windowsHide: true,
      shell: process.platform === "win32",
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);
    timer.unref?.();
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', (error: Error) => {
      clearTimeout(timer);
      resolve({
        command,
        args,
        exitCode: 1,
        stdout,
        stderr: `${stderr}${error.message}`.trim(),
        durationMs: Date.now() - started,
        timedOut,
      });
    });
    child.on('close', (code: number | null) => {
      clearTimeout(timer);
      resolve({
        command,
        args,
        exitCode: timedOut ? 124 : (code ?? 1),
        stdout,
        stderr,
        durationMs: Date.now() - started,
        timedOut,
      });
    });
  });
}

export async function runTestCommand(
  workspace: string,
  options: RunTestCommandOptions,
): Promise<CheckResult> {
  const args = options.args ?? [];
  const timeoutMs = options.timeoutMs ?? 600000;
  const processResult = await runProcess(workspace, options.command, args, timeoutMs, options.env);
  return createTestResult(processResult, options.name);
}
