/**
 * §7 Context 구성 — **Epic 5(맥락 연속 질문)를 완성하는 지점.**
 *
 * `sourceAnswers.service.ts`가 `questions.context_snapshot`에 저장하는 배선은 이미 있었다.
 * **그런데 재료가 없었다** — FinalAnswer·DecisionNote가 web Mock이라 DB에 없었기 때문이다.
 * SPEC-AI-003이 그 재료를 채우면서 비로소 동작한다.
 */

/** §7.4 — 구성 규칙이 바뀌면 올린다. */
export const CONTEXT_VERSION = "v1";

/** 이전 Question 하나의 재료. `sequenceNumber` 오름차순으로 들어온다. */
export interface PriorQuestion {
  sequenceNumber: number;
  message: string;
  /** 직전 Question이면 이것을 쓴다(§7.2). */
  finalAnswerContent: string | null;
  /** 그보다 이전이면 이것을 쓴다. */
  decisionNoteContent: string | null;
}

export interface BuiltContext {
  /** 3사 프롬프트에 실릴 텍스트. 재료가 없으면 null. */
  text: string | null;
  /** §7.3 — 상한에 걸려 **생략된 노트 수**. 조용히 자르지 않기 위해 스냅샷에 남긴다. */
  omittedNoteCount: number;
  /** 실제로 포함한 노트 수. */
  includedNoteCount: number;
  /** 직전 FinalAnswer를 포함했는가. */
  includedFinalAnswer: boolean;
  contextVersion: string;
}

/**
 * §7.2 구성 규칙.
 *
 * ```text
 * 직전 Question           → FinalAnswer 전문
 * 그보다 이전 Question들  → DecisionNote
 * ```
 *
 * **직전만 전문인 이유**: 바로 앞 결론은 자세히, 그 이전은 요약으로. 토큰을 아끼면서
 * 맥락을 유지한다.
 *
 * §7.3 상한 — DecisionNote는 최근 `maxNotes`개까지만. **초과분은 조용히 버리지 않고
 * 생략 건수를 기록한다**(§14 "no silent caps").
 */
export function buildContext(input: {
  /** 완료된 이전 Question들. `sequenceNumber` 오름차순. */
  priors: PriorQuestion[];
  maxNotes: number;
}): BuiltContext {
  const ordered = [...input.priors].sort(
    (a, b) => a.sequenceNumber - b.sequenceNumber,
  );

  const latest = ordered[ordered.length - 1];
  const earlier = ordered.slice(0, -1);

  const parts: string[] = [];
  let includedFinalAnswer = false;

  // 그 이전 Question들 — DecisionNote. 최근 것부터 채우고 상한을 넘으면 오래된 것을 뺀다.
  const notes = earlier.filter(
    (q): q is PriorQuestion & { decisionNoteContent: string } =>
      q.decisionNoteContent !== null && q.decisionNoteContent.trim().length > 0,
  );
  const kept = notes.slice(Math.max(0, notes.length - input.maxNotes));
  const omittedNoteCount = notes.length - kept.length;

  if (kept.length > 0) {
    parts.push("## 이전 결정 기록");
    for (const q of kept) {
      parts.push(`### ${q.sequenceNumber}. ${q.message.trim()}`);
      parts.push(q.decisionNoteContent.trim());
    }
  }

  // 직전 Question — FinalAnswer 전문.
  if (latest?.finalAnswerContent && latest.finalAnswerContent.trim().length > 0) {
    includedFinalAnswer = true;
    parts.push("## 직전 질문의 최종 답변");
    parts.push(`### ${latest.sequenceNumber}. ${latest.message.trim()}`);
    parts.push(latest.finalAnswerContent.trim());
  } else if (latest?.decisionNoteContent) {
    // 직전에 FinalAnswer가 없으면(생성 실패 등) 노트로 대신한다 — 맥락을 통째로 잃지 않는다.
    parts.push("## 직전 질문의 결정 기록");
    parts.push(`### ${latest.sequenceNumber}. ${latest.message.trim()}`);
    parts.push(latest.decisionNoteContent.trim());
  }

  return {
    text: parts.length > 0 ? parts.join("\n\n") : null,
    omittedNoteCount,
    includedNoteCount: kept.length,
    includedFinalAnswer,
    contextVersion: CONTEXT_VERSION,
  };
}
