/**
 * 단계 2 · 제목 의심 필터 + 쟁점 라벨 (SPEC-AI-002 §4.1·§4.2).
 * pivot 섹션 제목만 검사한다 — 단계 4가 만드는 새 제목은 이미 중립 규칙을 적용받는다.
 * 필터가 너무 넓게 잡는지는 titleRevisionRate 지표로 감시한다(§14.1).
 */

/** 특정 결론에 치우친 제목을 잡는 정규식(§4.2). 걸린 제목만 단계 4로 넘긴다. */
export const SUSPICIOUS_TITLE_PATTERNS: readonly RegExp[] = [
  /\d/, // "3~4명이 적정한 이유"
  /^왜\s/, // "왜 풀스택인가"
  /\?/, // "몇 명이 좋을까?"
  /(해야|하라|해라|하자|말아야)/, // "과잉채용을 피해야 한다"
  /(이유|위험성?|장점|단점|효과|필요성)$/, // "과잉 채용의 위험성"
  /(최고|최선|반드시|절대|핵심적인)/, // 단정 표현
];

export function isSuspiciousTitle(title: string): boolean {
  return SUSPICIOUS_TITLE_PATTERNS.some((pattern) => pattern.test(title));
}

/** 쟁점 임시 라벨 A, B, C, … (§4.1). 런타임에 pivot 섹션 수만큼 부여하고 신규는 이어 쓴다. */
export function agendaLabel(index: number): string {
  return String.fromCharCode(65 + index);
}
