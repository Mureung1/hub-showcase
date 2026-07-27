const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function send(event: Record<string, unknown>): void {
  fetch(`${API_BASE_URL}/api/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...event, timestamp: new Date().toISOString() }),
  }).catch(() => {});
}

export function sendPageview(path: string): void {
  send({ type: 'pageview', path });
}

export function sendError(message: string, stack?: string): void {
  send({ type: 'error', path: window.location.pathname, message, stack });
}
