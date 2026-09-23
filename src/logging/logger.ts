export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

export function createLogger(prefix?: string): Logger {
  const tag = prefix ? `[${prefix}]` : "";
  const stamp = (): string => new Date().toISOString();
  return {
    info: (message, ...args) => console.log(`${stamp()} INFO ${tag} ${message}`, ...args),
    warn: (message, ...args) => console.warn(`${stamp()} WARN ${tag} ${message}`, ...args),
    error: (message, ...args) => console.error(`${stamp()} ERROR ${tag} ${message}`, ...args),
    debug: (message, ...args) => console.debug(`${stamp()} DEBUG ${tag} ${message}`, ...args),
  };
}
