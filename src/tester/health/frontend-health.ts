export interface ServiceHealth {
  up: boolean;
  status: number | null;
  url: string;
  error?: string;
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function checkFrontendHealth(url: string, timeoutMs = 10000): Promise<ServiceHealth> {
  const target = url.replace(/\/+$/, '') || '/';
  try {
    const response = await fetch(target, { signal: AbortSignal.timeout(timeoutMs) });
    return {
      up: response.ok,
      status: response.status,
      url: target,
      error: response.ok ? undefined : `unexpected status ${response.status}`,
    };
  } catch (error) {
    return { up: false, status: null, url: target, error: toMessage(error) };
  }
}
