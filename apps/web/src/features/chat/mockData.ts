import type { Provider } from "./types";

/** SPEC-UI-001 0.6 — Mock 인증 완료 사용자 */
export const mockUser = {
  id: "user-1",
  email: "demo@example.com",
  emailVerified: true,
} as const;

/** MVP AI Provider 3종 표시 정보 — 표시 라벨은 Claude·ChatGPT·Gemini (docs/DESIGN.md 4장),
 * 내부 provider 식별자(`openai` 등)와는 분리해 유지한다. */
export const providerMeta: ReadonlyArray<{ id: Provider; label: string }> = [
  { id: "claude", label: "Claude" },
  { id: "openai", label: "ChatGPT" },
  { id: "gemini", label: "Gemini" },
];

/** 첫 진입 빈 화면의 예시 질문 칩 (Step 1-3: 클릭 시 입력창에 채워짐) */
export const exampleQuestions: readonly string[] = [
  "Supabase와 Firebase 중 어떤 것이 우리 서비스에 적합할까?",
  "MVP 단계에서 상태관리 라이브러리를 도입해야 할까?",
  "웹 서비스 배포는 Vercel과 AWS 중 무엇으로 시작할까?",
];

/** Step 1-3 결정: 첫 진입 인사 문구 (반복 개선 라운드에서 조정 가능) */
export const emptyStateGreeting = "무엇을 결정해야 하나요?";
