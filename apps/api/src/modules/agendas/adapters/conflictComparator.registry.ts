import type { ConflictComparator } from "../ports/conflictComparator.port.js";
import { createOpenRouterComparator } from "./openRouterComparator.adapter.js";

/**
 * 활성 ConflictComparator 선택 (ADR-005 §15.4).
 * "이음새당 초기 구현 하나" — 지금은 OpenRouter 어댑터뿐이다. 범용 로더는 만들지 않는다.
 */
let cached: ConflictComparator | null = null;

export function getConflictComparator(): ConflictComparator {
  if (!cached) cached = createOpenRouterComparator();
  return cached;
}
