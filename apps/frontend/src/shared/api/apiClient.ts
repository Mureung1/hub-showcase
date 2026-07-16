const DEFAULT_API_BASE_URL = "/api";

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  accessToken?: string;
};

export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<TResponse> {
  const headers = new Headers();

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.accessToken) {
    headers.set("Authorization", `Bearer ${options.accessToken}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  const responseBody = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(responseBody?.message ?? `API request failed: ${response.status}`);
  }

  return responseBody as TResponse;
}

export async function apiGet<TResponse>(path: string): Promise<TResponse> {
  return apiRequest<TResponse>(path);
}
