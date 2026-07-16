import type { Provider, SourceAnswerStatus } from "./types";

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
}

export interface ScenarioConfig {
  id: ScenarioId;
  /** Provider별 상태 전이 타임라인. 초기 상태는 항상 pending. */
  providerPlans: Record<Provider, SourceAnswerEvent[]>;
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
 * 시나리오별 SourceAnswer 타임라인.
 * TODO(T-009): provider-retry / provider-excluded / single-source-fallback의
 * 실패·재시도·제외 타임라인(Step 10 확정 연출)을 구현한다.
 * TODO(T-004~T-008): recheck-path / all-rejected / context-next-question은
 * Agenda·FinalAnswer 단계에서 분기하며, SourceAnswer 단계는 happy-path와 같다.
 */
const scenarioConfigs: Record<ScenarioId, ScenarioConfig> = {
  "happy-path": { id: "happy-path", providerPlans: happyPathPlans },
  "recheck-path": { id: "recheck-path", providerPlans: happyPathPlans },
  "provider-retry": { id: "provider-retry", providerPlans: happyPathPlans },
  "provider-excluded": {
    id: "provider-excluded",
    providerPlans: happyPathPlans,
  },
  "all-rejected": { id: "all-rejected", providerPlans: happyPathPlans },
  "context-next-question": {
    id: "context-next-question",
    providerPlans: happyPathPlans,
  },
  "single-source-fallback": {
    id: "single-source-fallback",
    providerPlans: happyPathPlans,
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
