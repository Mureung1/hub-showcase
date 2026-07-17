import { supabase } from "./supabaseClient.js"

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"

/**
 * Shared fetch wrapper. Expects every server response to follow the
 * { success, data } / { success: false, error } shape (see CLAUDE.md).
 * 로그인 세션이 있으면 Authorization 헤더로 access token을 함께 보낸다 —
 * 서버의 requireAuth/attachUser 미들웨어가 이 토큰으로 사용자를 식별한다.
 */
export async function apiRequest(path, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const headers = { "Content-Type": "application/json" }
  if (session) headers.Authorization = `Bearer ${session.access_token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...options,
  })

  const body = await res.json()

  if (!res.ok || !body.success) {
    throw new Error(body.error ?? `Request failed: ${path}`)
  }

  return body.data
}
