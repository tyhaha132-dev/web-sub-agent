import path from "node:path";

function assertSafeSegment(value: string, label: string): void {
  if (!value || value.includes("..") || path.isAbsolute(value) || value.includes("/") || value.includes("\\")) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

export function getPipelineArtifactDirectory(pipelineId: string): string {
  assertSafeSegment(pipelineId, "pipelineId");
  return path.join("artifacts", "pipelines", pipelineId);
}

export function getArtifactPath(pipelineId: string, name: string): string {
  assertSafeSegment(pipelineId, "pipelineId");
  assertSafeSegment(name, "artifact name");
  const dir = getPipelineArtifactDirectory(pipelineId);
  const full = path.normalize(path.join(dir, name));
  if (path.dirname(full) !== path.normalize(dir)) {
    throw new Error(`Invalid artifact name: ${name}`);
  }
  return full;
}
