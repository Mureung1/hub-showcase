import type { Provider, SourceAnswerStatus } from "./types";
import type { MockAgendaTemplate } from "./mockData";
import {
  mockAgendaTemplates,
  mockAllRejectedAgendaTemplates,
  mockSingleSourceAgendaTemplates,
} from "./mockData";

/**
 * 개발 전용 Mock 시나리오 전환 (SPEC-UI-001 0.5, Step 11).
 * `?scenario=<id>` Query String으로 선택하고 파라미터가 없으면 happy-path.
 * 실사용 UI에는 노출하지 않으며, 실제 백엔드 연결 시 제거한다.
 */
export const scenarioIds = [
  "happy-path",
  "recheck-path",
  "provider-retry",
  "provider-excluded",
  "all-rejected",
  "context-next-question",
  "single-source-fallback",
] as const;

export type ScenarioId = (typeof scenarioIds)[number];

/** SourceAnswer 상태 전이 1건 — 질문 전송 시점 기준 `at`(ms)에 적용된다 */
export interface SourceAnswerEvent {
  at: number;
  status: SourceAnswerStatus;
  /** 자동 재시도 시작 시 1로 올린다 (T-009) */
  retryCount?: 0 | 1;
  /** 재시도까지 실패해 비교에서 제외할 때 true (T-009) */
  excludedFromComparison?: boolean;
  /** 최종 제외 시 3열 답변 모달에 표시할 Mock 에러 코드 (Step 4-4) */
  errorCode?: string;
}

export interface ScenarioConfig {
  id: ScenarioId;
  /** Provider별 상태 전이 타임라인. 초기 상태는 항상 pending. */
  providerPlans: Record<Provider, SourceAnswerEvent[]>;
  /** Mock Manager가 생성할 Agenda 구성 fixture */
  agendaTemplates: readonly MockAgendaTemplate[];
}

/**
 * Step 3 확정: happy-path는 세 Provider가 0.6 / 1.2 / 1.8초에 순차 성공.
 * pending → processing → succeeded 순서가 보이도록 이전 Provider 성공 시점에
 * 다음 Provider가 processing으로 전이한다.
 */
const happyPathPlans: ScenarioConfig["providerPlans"] = {
  claude: [
    { at: 0, status: "processing" },
    { at: 600, status: "succeeded" },
  ],
  openai: [
    { at: 600, status: "processing" },
    { at: 1200, status: "succeeded" },
  ],
  gemini: [
    { at: 1200, status: "processing" },
    { at: 1800, status: "succeeded" },
  ],
};

/**
 * Step 10 확정 Mock 연출 (자동 재시도 — 수동 Retry 버튼 없음):
 * - provider-retry: ChatGPT가 0.8초에 실패 → 자동 재시도(스피너 + "재시도 중…") → 1.5초 후 성공
 * - provider-excluded: 실패 → 자동 재시도 → 재실패(총 ~2.5초) → excluded + 에러 코드
 * 첫 실패의 빨간 ✕가 잠시 보이도록 재시도 시작까지 0.4초 간격을 둔다.
 */
const providerRetryPlans: ScenarioConfig["providerPlans"] = {
  claude: [
    { at: 0, status: "processing" },
    { at: 600, status: "succeeded" },
  ],
  openai: [
    { at: 0, status: "processing" },
    { at: 800, status: "failed" },
    { at: 1200, status: "processing", retryCount: 1 },
    { at: 2700, status: "succeeded" },
  ],
  gemini: [
    { at: 600, status: "processing" },
    { at: 1800, status: "succeeded" },
  ],
};

const providerExcludedPlans: ScenarioConfig["providerPlans"] = {
  claude: [
    { at: 0, status: "processing" },
    { at: 600, status: "succeeded" },
  ],
  openai: [
    { at: 0, status: "processing" },
    { at: 800, status: "failed" },
    { at: 1200, status: "processing", retryCount: 1 },
    {
      at: 2500,
      status: "failed",
      excludedFromComparison: true,
      errorCode: "PROVIDER_TIMEOUT",
    },
  ],
  // Gemini는 ChatGPT 제외(2.5초) 뒤에 성공해, "제외됨" 회색 줄이 로딩 말풍선에
  // 남아 있는 상태를 화면에서 확인할 수 있게 한다 (Step 10-2: 숨기지 않음)
  gemini: [
    { at: 600, status: "processing" },
    { at: 3000, status: "succeeded" },
  ],
};

/** single-source-fallback: Claude만 성공, ChatGPT·Gemini는 재시도까지 실패해 제외 */
const singleSourcePlans: ScenarioConfig["providerPlans"] = {
  claude: [
    { at: 0, status: "processing" },
    { at: 600, status: "succeeded" },
  ],
  openai: [
    { at: 0, status: "processing" },
    { at: 800, status: "failed" },
    { at: 1200, status: "processing", retryCount: 1 },
    {
      at: 2500,
      status: "failed",
      excludedFromComparison: true,
      errorCode: "PROVIDER_TIMEOUT",
    },
  ],
  gemini: [
    { at: 0, status: "processing" },
    { at: 900, status: "failed" },
    { at: 1300, status: "processing", retryCount: 1 },
    {
      at: 2600,
      status: "failed",
      excludedFromComparison: true,
      errorCode: "PROVIDER_RATE_LIMITED",
    },
  ],
};

/**
 * 시나리오별 SourceAnswer 타임라인.
 * recheck-path / all-rejected / context-next-question은 Agenda·FinalAnswer
 * 단계에서 분기하며, SourceAnswer 단계는 happy-path와 같다.
 */
const scenarioConfigs: Record<ScenarioId, ScenarioConfig> = {
  "happy-path": {
    id: "happy-path",
    providerPlans: happyPathPlans,
    agendaTemplates: mockAgendaTemplates,
  },
  "recheck-path": {
    id: "recheck-path",
    providerPlans: happyPathPlans,
    agendaTemplates: mockAgendaTemplates,
  },
  "provider-retry": {
    id: "provider-retry",
    providerPlans: providerRetryPlans,
    agendaTemplates: mockAgendaTemplates,
  },
  "provider-excluded": {
    id: "provider-excluded",
    providerPlans: providerExcludedPlans,
    agendaTemplates: mockAgendaTemplates,
  },
  // Consensus 0건 + Conflict 2건 — 전부 제외해야만 all_agendas_rejected 고정 문구
  "all-rejected": {
    id: "all-rejected",
    providerPlans: happyPathPlans,
    agendaTemplates: mockAllRejectedAgendaTemplates,
  },
  "context-next-question": {
    id: "context-next-question",
    providerPlans: happyPathPlans,
    agendaTemplates: mockAgendaTemplates,
  },
  "single-source-fallback": {
    id: "single-source-fallback",
    providerPlans: singleSourcePlans,
    agendaTemplates: mockSingleSourceAgendaTemplates,
  },
};

function isScenarioId(value: string): value is ScenarioId {
  return (scenarioIds as readonly string[]).includes(value);
}

/** Query String에서 시나리오를 읽는다. 없거나 잘못된 값이면 happy-path. */
export function getActiveScenario(
  search: string = window.location.search,
): ScenarioConfig {
  const raw = new URLSearchParams(search).get("scenario") ?? "";
  return scenarioConfigs[isScenarioId(raw) ? raw : "happy-path"];
}
