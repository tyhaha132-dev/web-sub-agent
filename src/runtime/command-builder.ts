import type { TestCommand } from "../contracts/tester.js";

export function buildNpmCommand(args: string[]): TestCommand {
  return { command: "npm", args };
}

export function buildPythonCommand(args: string[]): TestCommand {
  return { command: "python", args };
}

export function buildDockerCommand(args: string[]): TestCommand {
  return { command: "docker", args };
}
