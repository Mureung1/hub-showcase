import type { AnswerSection, Provider } from "./types";

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

/**
 * 성공한 SourceAnswer에 채우는 Provider별 Mock Section (0.6 임시 계약).
 * 렌더링은 전문 스타일로 이어붙이지만 내부 데이터는 sectionId를 가진
 * Section 배열 구조를 유지한다 (Step 4-3 고정 계약 — Agenda 근거 추적용).
 */
export const mockSectionsByProvider: Record<
  Provider,
  readonly AnswerSection[]
> = {
  claude: [
    {
      sectionId: "claude-s1",
      title: "요약",
      content:
        "RLS는 사용자별 데이터 접근을 테이블 단위로 제어하는 핵심 보안 기능입니다. 정책이 없으면 기본적으로 모든 접근이 차단됩니다.",
    },
    {
      sectionId: "claude-s2",
      title: "권장",
      content:
        "모든 public 테이블에 RLS를 기본 ON으로 켜고, 정책은 SQL 마이그레이션 파일로 작성해 버전 관리하는 것을 권장합니다.",
    },
    {
      sectionId: "claude-s3",
      title: "주의",
      content:
        "service_role 키는 RLS를 우회하므로 반드시 서버 환경에서만 사용해야 합니다.",
    },
  ],
  openai: [
    {
      sectionId: "openai-s1",
      title: "요약",
      content:
        "RLS를 켜면 정책이 정의되기 전까지는 모든 행 접근이 막히므로, 켜는 즉시 정책을 함께 준비해야 합니다.",
    },
    {
      sectionId: "openai-s2",
      title: "권장",
      content:
        "먼저 대시보드 UI에서 정책을 만들어 빠르게 검증하고, auth.uid() 기준으로 행을 제한하는 방식으로 시작하길 권장합니다.",
    },
    {
      sectionId: "openai-s3",
      title: "주의",
      content:
        "정책 없이 RLS만 켜면 앱이 데이터를 읽지 못해 오류가 날 수 있으니 주의해야 합니다.",
    },
  ],
  gemini: [
    {
      sectionId: "gemini-s1",
      title: "요약",
      content:
        "RLS는 Postgres의 행 수준 보안을 그대로 활용하는 방식으로, 테이블마다 접근 규칙을 세밀하게 정의할 수 있습니다.",
    },
    {
      sectionId: "gemini-s2",
      title: "권장",
      content:
        "public 테이블에 RLS를 켜고 정책은 SQL 파일로 관리하되, select/insert/update/delete를 나눠 정의하는 것을 권장합니다.",
    },
    {
      sectionId: "gemini-s3",
      title: "주의",
      content:
        "service_role 키를 클라이언트에 노출하면 안 되며, 프론트엔드에는 공개 가능한 키만 두어야 합니다.",
    },
  ],
};
