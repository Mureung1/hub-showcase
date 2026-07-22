import { apiUrl } from "./api";

export async function loadApiReadiness(signal: AbortSignal): Promise<void> {
  const response = await fetch(apiUrl("/ready"), { signal });
  if (!response.ok) throw new Error(`API readiness ${response.status}`);

  const payload = (await response.json()) as { status?: string };
  if (payload.status !== "ready") throw new Error("API readiness payload is invalid.");
}
