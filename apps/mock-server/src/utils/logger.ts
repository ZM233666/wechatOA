export function logInfo(message: string, extra?: Record<string, unknown>): void {
  if (extra) {
    console.log(`[mock-server] ${message}`, extra);
    return;
  }
  console.log(`[mock-server] ${message}`);
}

export function logWarn(message: string, extra?: Record<string, unknown>): void {
  if (extra) {
    console.warn(`[mock-server] ${message}`, extra);
    return;
  }
  console.warn(`[mock-server] ${message}`);
}

export function logError(message: string, extra?: Record<string, unknown>): void {
  if (extra) {
    console.error(`[mock-server] ${message}`, extra);
    return;
  }
  console.error(`[mock-server] ${message}`);
}
