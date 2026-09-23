import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type FrontendFramework = "nextjs" | "unknown";

const NEXT_CONFIG_FILES = [
  "next.config.js",
  "next.config.mjs",
  "next.config.cjs",
  "next.config.ts",
];

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export function detectFrontend(dir: string): FrontendFramework {
  for (const file of NEXT_CONFIG_FILES) {
    if (existsSync(path.join(dir, file))) {
      return "nextjs";
    }
  }
  const packageJsonPath = path.join(dir, "package.json");
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as PackageJson;
      if (pkg.dependencies?.next ?? pkg.devDependencies?.next) {
        return "nextjs";
      }
    } catch {
      return "unknown";
    }
  }
  return "unknown";
}

export type BackendFramework = "fastapi" | "unknown";

export function detectBackend(dir: string): BackendFramework {
  const requirementsPath = path.join(dir, "requirements.txt");
  if (existsSync(requirementsPath)) {
    try {
      const content = readFileSync(requirementsPath, "utf-8").toLowerCase();
      if (content.includes("fastapi")) {
        return "fastapi";
      }
    } catch {
      // Fall through to the main.py checks below.
    }
  }
  if (existsSync(path.join(dir, "app", "main.py"))) {
    return "fastapi";
  }
  const mainPy = path.join(dir, "main.py");
  if (existsSync(mainPy)) {
    try {
      if (readFileSync(mainPy, "utf-8").includes("fastapi")) {
        return "fastapi";
      }
    } catch {
      return "unknown";
    }
  }
  return "unknown";
}
