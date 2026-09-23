import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface ProjectManifest {
  frontend: string;
  backend: string;
  database: string;
}

export const MANIFEST_FILENAME = "manifest.json";

export async function createManifest(
  workspace: string,
  manifest: ProjectManifest = { frontend: "nextjs", backend: "fastapi", database: "postgres" },
): Promise<ProjectManifest> {
  await mkdir(workspace, { recursive: true });
  await writeFile(
    path.join(workspace, MANIFEST_FILENAME),
    JSON.stringify(manifest, null, 2),
    "utf-8",
  );
  return manifest;
}

export async function readManifest(workspace: string): Promise<ProjectManifest> {
  const raw = await readFile(path.join(workspace, MANIFEST_FILENAME), "utf-8");
  return JSON.parse(raw) as ProjectManifest;
}
