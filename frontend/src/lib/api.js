// 백엔드 연구 데이터 API 클라이언트 (에이전트 c, 프론트).
// 서버가 없어도 앱은 동작해야 하므로 호출부에서 실패를 잡는다.

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
const ANON_KEY = "hub-anon-id";

// 무료 티어(Render)는 15분 미사용 시 슬립하고, 첫 요청이 깨우는 데 수십 초가 걸린다(2026-07-28 실측 15.4초).
// 타임아웃이 없으면 백엔드가 죽어 있을 때 화면이 무한 대기한다 — 상한을 두고 명확한 에러로 끝낸다.
const DEFAULT_TIMEOUT_MS = 20000;
const WAKEUP_TIMEOUT_MS = 60000; // health: 콜드스타트 웨이크업을 기다려 준다

async function request(path, { timeoutMs = DEFAULT_TIMEOUT_MS, ...options } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      ...options,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`api timeout ${timeoutMs}ms`, { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    throw new Error(`api ${res.status}`);
  }
  return res.json();
}

// 익명 참가자 ID(개인정보 아님)를 브라우저에 1개 유지한다.
export function getAnonId() {
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() ?? `anon-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

export function getHealth() {
  return request("/api/health", { timeoutMs: WAKEUP_TIMEOUT_MS });
}

export function getAnalysis() {
  return request("/api/analysis");
}

export function saveResult(payload) {
  return request("/api/results", { method: "POST", body: JSON.stringify(payload) });
}

export function listResults(anonId) {
  return request(`/api/results?anonId=${encodeURIComponent(anonId)}`);
}

export function deleteResults(anonId) {
  return request(`/api/results?anonId=${encodeURIComponent(anonId)}`, { method: "DELETE" });
}

// 간이 MBTI 추정 채팅(ADR-008). 동의한 사용자의 대화 원문을 이 경로로만 보낸다.
// 서버가 없거나 실패하면 호출부가 규칙 설문으로 폴백하도록 null 유사 응답을 던진다.
// knownMbti가 있으면 보충 모드(확정 유형 유지 + 근거만). 없으면 간이 추정.
export function estimateMbtiFromChat(messages, knownMbti = "") {
  return request("/api/mbti-chat", {
    method: "POST",
    // 콜드스타트 + 외부 LLM 왕복이라 기본 20초로는 짧다.
    timeoutMs: WAKEUP_TIMEOUT_MS,
    body: JSON.stringify({ consent: true, messages, knownMbti }),
  });
}
