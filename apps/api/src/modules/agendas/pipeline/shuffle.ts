/**
 * 단계 2 · 순서 셔플 (SPEC-AI-002 §4.3).
 * 여러 문서를 LLM에 넣을 때 입력 순서가 결과를 바꾼다(위치 편향 10~15%p). 순서를 고정하면
 * "3사 공평 비교" 약속이 조용히 깨지므로, 시드 기반으로 셔플하고 시드를 기록한다(AC1).
 * 시드는 fnv1a(questionId)이며 manager_meta.shuffleSeed에 남긴다.
 */

/** mulberry32 — 시드 하나로 재현 가능한 난수열. */
export function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates. 같은 seed면 항상 같은 순서를 낸다(재현성). 입력을 변형하지 않는다. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) continue; // 도달 불가(유효 인덱스) — 타입 좁힘
    out[i] = b;
    out[j] = a;
  }
  return out;
}
