export interface TestCommand {
  command: string;
  args: string[];
}

export interface TestPlanConfig {
  commands: TestCommand[];
}

export interface CheckResult {
  name: string;
  passed: boolean;
  output: string;
  durationMs: number;
}
