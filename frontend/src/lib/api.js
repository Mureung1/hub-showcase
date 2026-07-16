// backend REST API 호출 최소 래퍼. 모든 데이터 접근은 이걸 통해 backend를 탄다
// (frontend는 Supabase를 직접 부르지 않는다 — CLAUDE.md 규칙).

const BASE = import.meta.env.VITE_API_URL ?? '/api'

export async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error ?? `요청 실패 (${res.status})`)
  }
  return data
}
