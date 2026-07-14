import { healthResponseSchema, type HealthResponse } from "@baro-jinryo/shared";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

export async function getApiHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${apiBaseUrl}/health/live`, { signal: signal ?? null });

  if (!response.ok) {
    throw new Error(`API 상태 확인 실패: ${response.status}`);
  }

  return healthResponseSchema.parse(await response.json());
}
