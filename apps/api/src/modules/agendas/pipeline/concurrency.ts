/**
 * 입력 순서를 보존하는 동시성 제한 map (SPEC-AI-002 §5.1 · AC1).
 * 결과 배열은 항상 items 순서와 1:1로 맞춰지므로, 완료 순서와 무관하게 병합이 결정론적이다.
 * Math.random을 쓰지 않는다.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const cap = Math.max(1, limit);
  let next = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      const item = items[index];
      if (item === undefined) return; // 도달 불가(유효 인덱스) — 타입 좁힘
      results[index] = await fn(item, index);
    }
  }

  const workers = Array.from({ length: Math.min(cap, items.length) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return results;
}
