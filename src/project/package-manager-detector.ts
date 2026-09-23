import { existsSync } from "node:fs";
import path from "node:path";

export type PackageManager = "pnpm" | "yarn" | "npm";

export function detectPackageManager(dir: string): PackageManager {
  if (existsSync(path.join(dir, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (existsSync(path.join(dir, "yarn.lock"))) {
    return "yarn";
  }
  return "npm";
}
