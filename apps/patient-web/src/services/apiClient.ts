import type {
  HealthResponse,
  MockPatientConfig,
  OnsiteWaitingStatus,
  PatientRegistrationInput,
  QueuePosition,
} from "@baro-jinryo/shared";
import { healthResponseSchema } from "@baro-jinryo/shared";
import { getSupabaseClient } from "./supabaseClient";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

export interface PatientProfile {
  id: string;
  phoneNumber: string;
  accountType: "patient";
  status: "active" | "suspended" | "withdrawn";
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await getSupabaseClient().auth.getSession();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(`API 요청 실패: ${response.status}`);
  return (await response.json()) as T;
}

export async function getApiHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const result = await requestJson<unknown>("/health/live", { signal: signal ?? null });
  return healthResponseSchema.parse(result);
}

export function getPatientConfig(hospitalId: string): Promise<MockPatientConfig> {
  return requestJson(`/hospitals/${encodeURIComponent(hospitalId)}`);
}

export async function getPatientWaiting(): Promise<QueuePosition | null> {
  const result = await requestJson<{ waiting: QueuePosition | null }>("/me/waiting");
  return result.waiting;
}

export async function registerRemoteWaiting(
  hospitalId: string,
  input: PatientRegistrationInput,
): Promise<QueuePosition> {
  const result = await requestJson<QueuePosition>(`/hospitals/${encodeURIComponent(hospitalId)}/waitings`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result;
}

export async function deferPatientWaiting(): Promise<QueuePosition | null> {
  const result = await requestJson<{ waiting: QueuePosition | null }>(
    "/me/waiting/defer",
    { method: "POST" },
  );
  return result.waiting;
}

export async function cancelPatientWaiting(): Promise<QueuePosition | null> {
  const result = await requestJson<{ waiting: QueuePosition | null }>("/me/waiting/cancel", {
    method: "POST",
  });
  return result.waiting;
}

export async function createPatientProfile(phoneNumber: string, accessToken: string): Promise<void> {
  await requestJson("/profiles", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ phoneNumber, accountType: "patient" }),
  });
}

export async function getCurrentPatientProfile(accessToken: string): Promise<PatientProfile | null> {
  const result = await requestJson<{ profile: PatientProfile | null }>("/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return result.profile;
}

export async function getOnsiteWaitingStatus(
  lookupToken: string,
): Promise<OnsiteWaitingStatus | null> {
  const response = await fetch(
    `${apiBaseUrl}/waitings/status/${encodeURIComponent(lookupToken)}`,
  );
  if (response.status === 410 || response.status === 404) return null;
  if (!response.ok) throw new Error(`API 요청 실패: ${response.status}`);
  return (await response.json()) as OnsiteWaitingStatus;
}
