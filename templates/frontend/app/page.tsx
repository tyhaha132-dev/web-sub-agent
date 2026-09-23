async function getBackendStatus(): Promise<string> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
  try {
    const res = await fetch(`${base}/health`, { cache: 'no-store' });
    if (!res.ok) {
      return `backend responded ${res.status}`;
    }
    const data = (await res.json()) as { status?: string };
    return data.status ?? 'ok';
  } catch {
    return 'unreachable';
  }
}

export default async function Home() {
  const backendStatus = await getBackendStatus();
  return (
    <main>
      <h1>Web App</h1>
      <p>Backend: {backendStatus}</p>
    </main>
  );
}
