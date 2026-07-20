const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface ErrorBody {
  success?: boolean;
  error?: { code?: string; message?: string };
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  const body = (await res.json().catch(() => ({}))) as T & ErrorBody;

  if (!res.ok) {
    throw new ApiError(
      body.error?.message ?? `요청에 실패했습니다. (${res.status})`,
      res.status,
      body.error?.code,
    );
  }

  return body;
}
