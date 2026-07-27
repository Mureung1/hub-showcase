type ApiErrorBody = { error: { code: string; message: string } };

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    return body.error?.message ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res;
}
