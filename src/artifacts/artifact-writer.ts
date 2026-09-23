import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getArtifactPath } from "./artifact-path.js";

export async function writeArtifact(
  pipelineId: string,
  name: string,
  content: string | Uint8Array,
): Promise<string> {
  const file = getArtifactPath(pipelineId, name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
  return file;
}
