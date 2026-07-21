// api/lectures.js
// 백엔드 GET /api/lectures 호출 래퍼.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export async function fetchLectures({ year, semester, department, category } = {}) {
  const params = new URLSearchParams({ year, semester });
  if (department) params.set("department", department);
  if (category) params.set("category", category);

  const res = await fetch(`${API_BASE_URL}/api/lectures?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `강의 조회 실패 (${res.status})`);
  }
  return res.json();
}
