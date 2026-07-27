// 과목 데이터 CRUD를 서버(DB)에 요청한다.
// 서버가 없으면(정적 배포·서버 다운) 각 함수는 { ok: false }를 돌려주고,
// 호출하는 App 쪽에서 localStorage 기반 로컬 동작으로 폴백한다.

const BASE = "/api/subjects";

export async function fetchSubjects() {
  try {
    const response = await fetch(BASE);
    if (!response.ok) {
      throw new Error(`서버 응답 오류: ${response.status}`);
    }
    const data = await response.json();
    return { ok: true, subjects: data.subjects };
  } catch {
    return { ok: false };
  }
}

export async function createSubject(subjectInput) {
  try {
    const response = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subjectInput),
    });
    if (!response.ok) {
      throw new Error(`서버 응답 오류: ${response.status}`);
    }
    const data = await response.json();
    return { ok: true, subject: data.subject };
  } catch {
    return { ok: false };
  }
}

export async function updateSubject(id, subjectInput) {
  try {
    const response = await fetch(`${BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subjectInput),
    });
    if (!response.ok) {
      throw new Error(`서버 응답 오류: ${response.status}`);
    }
    const data = await response.json();
    return { ok: true, subject: data.subject };
  } catch {
    return { ok: false };
  }
}

export async function completeSubject(id) {
  try {
    const response = await fetch(`${BASE}/${id}/complete`, { method: "PATCH" });
    if (!response.ok) {
      throw new Error(`서버 응답 오류: ${response.status}`);
    }
    const data = await response.json();
    return { ok: true, subject: data.subject };
  } catch {
    return { ok: false };
  }
}

export async function deleteSubject(id) {
  try {
    const response = await fetch(`${BASE}/${id}`, { method: "DELETE" });
    if (!response.ok) {
      throw new Error(`서버 응답 오류: ${response.status}`);
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
