import { ALL_PROVIDERS } from "../../sourceAnswers/providers/registry.js";
import type { Agenda, AiProvider, SourceAnswer } from "@decision-log/shared";

import type { ModeResult } from "../finalAnswers.types.js";

/**
 * §4 `generation_mode` 결정 — **코드가 한다.** LLM에 묻지 않는다.
 *
 * ```text
 * passed Agenda 수 = 0                 → all_agendas_rejected  (AI 미호출)
 * 성공한 SourceAnswer provider 수 = 1  → single_source_fallback
 * 그 외                                 → multi_source
 * ```
 *
 * ⚠️ **판단 순서가 중요하다.** 전부 rejected가 먼저다 — 그때는 provider 수와 무관하게
 * AI를 부르지 않는다. 순서를 뒤집으면 "단일 provider인데 전부 rejected"인 경우가
 * `single_source_fallback`으로 잘못 분류돼 부를 필요 없는 AI를 부른다.
 */

/**
 * 비교에 실제로 기여한 provider (§3.1).
 * `succeeded`이고 **비교에서 제외되지 않은** 것만 센다 — 재시도까지 실패해 제외된
 * provider는 답변이 있어도 Agenda의 재료가 아니었다.
 */
export function succeededProviders(
  sourceAnswers: SourceAnswer[],
): AiProvider[] {
  const set = new Set<AiProvider>();
  for (const answer of sourceAnswers) {
    if (answer.status !== "succeeded") continue;
    if (answer.excludedFromComparison) continue;
    if (answer.structuredContent === null) continue;
    set.add(answer.provider);
  }
  // 표시·스냅샷 순서를 고정한다(재현성).
  return ALL_PROVIDERS.filter((provider) => set.has(provider));
}

export function decideGenerationMode(input: {
  agendas: Agenda[];
  sourceAnswers: SourceAnswer[];
}): ModeResult {
  const passed = input.agendas.filter((agenda) => agenda.status === "passed");
  const rejected = input.agendas.filter(
    (agenda) => agenda.status === "rejected",
  );
  const succeeded = succeededProviders(input.sourceAnswers);

  // 1순위 — 확정된 내용이 하나도 없으면 종합할 것이 없다. AI를 부르지 않는다(§4.1).
  if (passed.length === 0) {
    return {
      mode: "all_agendas_rejected",
      excludedProviders: [],
      passedCount: 0,
      rejectedCount: rejected.length,
    };
  }

  // 2순위 — §5.3이 **"정확히 하나"** 로 못박았다. 2개 이상은 multi_source다.
  if (succeeded.length === 1) {
    return {
      mode: "single_source_fallback",
      excludedProviders: ALL_PROVIDERS.filter(
        (provider) => !succeeded.includes(provider),
      ),
      passedCount: passed.length,
      rejectedCount: rejected.length,
    };
  }

  return {
    mode: "multi_source",
    excludedProviders: [],
    passedCount: passed.length,
    rejectedCount: rejected.length,
  };
}

/**
 * §2.1 — **Agenda 집합이 확정됐는가.**
 *
 * ⚠️ **이 판정을 한 곳에만 둔다.** SPEC-AI-002에서 같은 계열의 갇힘이 네 번 나왔고,
 * 원인은 매번 조건을 각 지점에 흩어놓은 것이었다(T-019.1·019.4·019.5·019.6).
 * `runManagerForQuestion`(충돌 0건)과 `applyUserDecision`(사용자 판단 후) 양쪽이
 * **이 함수를 호출**하며, 조건을 복사하지 않는다.
 *
 * 0건도 정상 입력이다 — Manager 완전 실패는 여기가 아니라 SPEC-AI-002 §2.5가 처리하므로,
 * 쟁점이 하나도 없으면 FinalAnswer 생성을 시작하지 않는다.
 */
export function isAgendaSetSettled(agendas: Agenda[]): boolean {
  if (agendas.length === 0) return false;
  return agendas.every(
    (agenda) => agenda.status === "passed" || agenda.status === "rejected",
  );
}
