import type { AgendaRechecker } from "../ports/agendaRechecker.port.js";
import { createOpenRouterRechecker } from "./openRouterRecheck.adapter.js";

/**
 * 활성 AgendaRechecker 선택 (ADR-005 §15.4).
 * "이음새당 초기 구현 하나" — 지금은 OpenRouter 어댑터뿐이다.
 */
let cached: AgendaRechecker | null = null;

export function getAgendaRechecker(): AgendaRechecker {
  if (!cached) cached = createOpenRouterRechecker();
  return cached;
}
