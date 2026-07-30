import type { FinalAnswerComposer } from "../ports/finalAnswerComposer.port.js";
import { createOpenRouterComposer } from "./openRouterComposer.adapter.js";

/**
 * 활성 FinalAnswerComposer 선택 (ADR-005 §15.4).
 * "이음새당 초기 구현 하나" — 지금은 OpenRouter 어댑터뿐이다.
 */
let cached: FinalAnswerComposer | null = null;

export function getFinalAnswerComposer(): FinalAnswerComposer {
  if (!cached) cached = createOpenRouterComposer();
  return cached;
}
