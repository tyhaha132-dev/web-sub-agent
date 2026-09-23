export interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export function isSuccess(result: ProcessResult): boolean {
  return result.exitCode === 0;
}
