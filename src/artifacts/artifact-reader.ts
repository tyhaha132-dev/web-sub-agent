import { access, readFile } from "node:fs/promises";
import { getArtifactPath } from "./artifact-path.js";

export async function readArtifact(pipelineId: string, name: string): Promise<string> {
  return readFile(getArtifactPath(pipelineId, name), "utf-8");
}

export async function artifactExists(pipelineId: string, name: string): Promise<boolean> {
  try {
    await access(getArtifactPath(pipelineId, name));
    return true;
  } catch {
    return false;
  }
}
