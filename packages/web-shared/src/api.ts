interface ApiErrorContext {
  status: number;
  body: unknown;
}

interface JsonRequesterOptions {
  baseUrl: string;
  getAccessToken: () => Promise<string | undefined>;
  createError?: (context: ApiErrorContext) => Error;
}

export function createJsonRequester({
  baseUrl,
  getAccessToken,
  createError,
}: JsonRequesterOptions) {
  return async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
    const accessToken = await getAccessToken();
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init?.headers,
      },
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as unknown;
      throw (
        createError?.({ status: response.status, body }) ??
        new Error(`API 요청 실패: ${response.status}`)
      );
    }

    return (await response.json()) as T;
  };
}
