import path from "node:path";

export const PATHS = {
  projectRoot: process.cwd(),
  source: path.join(process.cwd(), "src"),
  tests: path.join(process.cwd(), "tests"),
  artifacts: path.join(process.cwd(), "artifacts"),
  workspaces: path.join(process.cwd(), "workspaces"),
};
