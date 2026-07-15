import type {
  HealthResponse,
  MockPatientConfig,
  MockOnsiteWaitingStatus,
  PatientRegistrationInput,
  QueuePosition,
} from "@baro-jinryo/shared";
import { healthResponseSchema } from "@baro-jinryo/shared";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(`API 요청 실패: ${response.status}`);
  return (await response.json()) as T;
}

export async function getApiHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const result = await requestJson<unknown>("/health/live", { signal: signal ?? null });
  return healthResponseSchema.parse(result);
}

export function getPatientConfig(): Promise<MockPatientConfig> {
  return requestJson("/mock/patient/config");
}

export async function getPatientWaiting(): Promise<QueuePosition | null> {
  const result = await requestJson<{ waiting: QueuePosition | null }>("/mock/patient/waiting");
  return result.waiting;
}

export async function registerRemoteWaiting(
  input: PatientRegistrationInput,
): Promise<QueuePosition> {
  const result = await requestJson<{ waiting: QueuePosition }>("/mock/patient/waiting", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result.waiting;
}

export async function deferPatientWaiting(): Promise<QueuePosition | null> {
  const result = await requestJson<{ waiting: QueuePosition | null }>(
    "/mock/patient/waiting/defer",
    { method: "POST" },
  );
  return result.waiting;
}

export async function cancelPatientWaiting(): Promise<QueuePosition | null> {
  const result = await requestJson<{ waiting: QueuePosition | null }>("/mock/patient/waiting", {
    method: "DELETE",
  });
  return result.waiting;
}

export async function getOnsiteWaitingStatus(
  lookupToken: string,
): Promise<MockOnsiteWaitingStatus | null> {
  const response = await fetch(
    `${apiBaseUrl}/mock/onsite-status/${encodeURIComponent(lookupToken)}`,
  );
  if (response.status === 410 || response.status === 404) return null;
  if (!response.ok) throw new Error(`API 요청 실패: ${response.status}`);
  return (await response.json()) as MockOnsiteWaitingStatus;
}
