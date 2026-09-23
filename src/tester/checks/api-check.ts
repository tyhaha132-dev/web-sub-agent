import type { CheckResult } from '../test-result.js';

function resolveBackendUrl(explicit?: string): string {
  if (explicit !== undefined && explicit !== '') {
    return explicit.replace(/\/+$/, '');
  }
  if (process.env.BACKEND_URL !== undefined && process.env.BACKEND_URL !== '') {
    return process.env.BACKEND_URL.replace(/\/+$/, '');
  }
  const port = process.env.BACKEND_PORT ?? '8000';
  return `http://localhost:${port}`;
}

export async function checkApiHealth(workspace: string, backendUrl?: string): Promise<CheckResult> {
  void workspace;
  const started = Date.now();
  const base = resolveBackendUrl(backendUrl);
  for (const path of ['/health', '/docs']) {
    try {
      const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(10000) });
      if (response.status === 200) {
        return {
          name: 'api-health',
          status: 'passed',
          message: `GET ${path} -> 200`,
          durationMs: Date.now() - started,
        };
      }
    } catch {
      // Backend down or unreachable: try the next endpoint, then fail.
    }
  }
  return {
    name: 'api-health',
    status: 'failed',
    message: `backend unreachable at ${base} (tried /health, /docs)`,
    durationMs: Date.now() - started,
  };
}
