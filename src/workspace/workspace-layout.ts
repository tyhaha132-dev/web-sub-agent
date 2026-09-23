import path from "node:path";

export function getFrontendDir(workspace: string): string {
  return path.join(workspace, "frontend");
}

export function getBackendDir(workspace: string): string {
  return path.join(workspace, "backend");
}

export function getDocsDir(workspace: string): string {
  return path.join(workspace, "docs");
}
