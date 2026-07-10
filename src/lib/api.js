// 프론트에서 백엔드 호출 시 공통으로 쓰는 얇은 fetch 래퍼.
// 서버가 항상 성공 시 리소스를 그대로, 실패 시 { error: { code, message } }를 반환하는 규약(CLAUDE.md 컨벤션)을 여기서 한 번만 처리한다.

export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const { code, message } = body?.error ?? {};
    throw new ApiError(code ?? "unknown_error", message ?? res.statusText);
  }

  return body;
}
