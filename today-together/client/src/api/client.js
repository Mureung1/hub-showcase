// 공통 fetch 래퍼
// 백엔드 연결 전이므로 baseURL만 미리 잡아둔다.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new Error(message || `요청 실패: ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const apiClient = {
  get: (path) => request(path, { method: "GET" }),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
};
