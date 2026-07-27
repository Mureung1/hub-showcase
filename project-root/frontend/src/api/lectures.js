// api/lectures.js
// 백엔드 /api/lectures 호출 래퍼.
import { supabase } from "./supabaseClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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

// 로그인한 사용자가 "이 과목은 전공필수예요"라고 신고. 학교 API/수기 큐레이션이 놓친
// 학과의 전공필수 과목을 크라우드소싱으로 채우기 위함.
export async function reportRequiredCourse({ department, courseName }) {
  const res = await fetch(`${API_BASE_URL}/api/lectures/required-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ department, courseName }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `전공필수 신고 실패 (${res.status})`);
  }
  return res.json();
}
