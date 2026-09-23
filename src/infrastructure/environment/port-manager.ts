import net from "node:net";

/** True when nothing is listening on the port on localhost. */
export function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
  });
}

/** Scan upward from `start` and return the first free port. */
export async function findFreePort(start: number, maxAttempts = 100): Promise<number> {
  if (!Number.isInteger(start) || start < 1 || start > 65535) {
    throw new Error(`Invalid start port ${String(start)}`);
  }
  for (let i = 0; i < maxAttempts; i++) {
    const port = start + i;
    if (port > 65535) break;
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No free port found starting at ${String(start)}`);
}
