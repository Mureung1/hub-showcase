// api/timetables.js
// 백엔드 /api/timetables 호출 래퍼. 로그인한 사용자 것만 다루므로 Supabase 세션의
// access_token을 Authorization 헤더로 실어 보낸다.
import { supabase } from "./supabaseClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function saveTimetable({ year, semester, label, lectureIds }) {
  const res = await fetch(`${API_BASE_URL}/api/timetables`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ year, semester, label, lectureIds }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `시간표 저장 실패 (${res.status})`);
  }
  return res.json();
}

export async function fetchCurrentTimetable({ year, semester }) {
  const params = new URLSearchParams({ year, semester });
  const res = await fetch(`${API_BASE_URL}/api/timetables/current?${params}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `시간표 조회 실패 (${res.status})`);
  }
  return res.json();
}
