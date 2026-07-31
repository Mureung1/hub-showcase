import type { AgendaClassifier } from "../ports/agendaClassifier.port.js";
import { createOpenRouterClassifier } from "./openRouterClassifier.adapter.js";

/**
 * 활성 AgendaClassifier 선택 (ADR-005 §15.4).
 * "이음새당 초기 구현 하나" — 지금은 OpenRouter 어댑터뿐이다. 범용 로더는 만들지 않는다.
 */
let cached: AgendaClassifier | null = null;

export function getAgendaClassifier(): AgendaClassifier {
  if (!cached) cached = createOpenRouterClassifier();
  return cached;
}
