import type { AiProvider } from "@decision-log/shared";

/**
 * 단계 1 · pivot 선택 (SPEC-AI-002 §3.2, 코드·LLM 0회).
 * 같은 questionId는 언제 다시 돌려도 같은 pivot을 내야 재현·감사가 가능하다 —
 * 그래서 Math.random()을 쓰지 않고, 동점은 FNV-1a 해시로만 가른다(AC1).
 */

/** FNV-1a 32비트. 문자 합과 달리 순서에 민감하고 UUID의 좁은 알파벳에서도 분포가 균등하다(§3.2). */
export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export interface PivotCandidate {
  provider: AiProvider;
  sectionCount: number;
}

export interface PivotResult {
  provider: AiProvider;
  reason: "max_sections" | "hash_tiebreak";
}

/**
 * pivot = 섹션 수 최다. 동점이면 FNV-1a(questionId) % 동점자수.
 * ⚠️ `sort()`가 재현성의 전제 — 정렬하지 않으면 입력 배열 순서(완료 순서 등)에 pivot이 흔들린다.
 */
export function pickPivot(
  candidates: PivotCandidate[],
  questionId: string,
): PivotResult {
  const max = Math.max(...candidates.map((c) => c.sectionCount));
  const tied = candidates
    .filter((c) => c.sectionCount === max)
    .map((c) => c.provider)
    .sort(); // 알파벳순 — 재현성의 전제
  const single = tied.length === 1;
  const chosen = tied[single ? 0 : fnv1a(questionId) % tied.length];
  if (chosen === undefined) {
    // 도달 불가 — 호출부가 후보 ≥1을 보장한다. 타입을 좁히려는 방어.
    throw new Error("pivot 후보가 비어 있습니다.");
  }
  return { provider: chosen, reason: single ? "max_sections" : "hash_tiebreak" };
}
