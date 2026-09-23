import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export interface AuditEvent {
  type: string;
  message: string;
  timestamp?: string;
  data?: unknown;
}

function pipelineDir(pipelineId: string): string {
  return path.join(process.cwd(), "artifacts", "pipelines", pipelineId);
}

export async function appendAuditEvent(pipelineId: string, event: AuditEvent): Promise<void> {
  const dir = pipelineDir(pipelineId);
  await mkdir(dir, { recursive: true });
  const record = {
    timestamp: event.timestamp ?? new Date().toISOString(),
    pipelineId,
    type: event.type,
    message: event.message,
    data: event.data ?? null,
  };
  await appendFile(path.join(dir, "audit.log"), `${JSON.stringify(record)}\n`, "utf8");
}
