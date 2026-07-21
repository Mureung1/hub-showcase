/** 완료된 항목을 배열 하단으로 내린다 (plan.md 3.2.2). 순서 안정성을 위해 원본을 변형하지 않는다. */
export function sortByCompleted<T>(items: T[], isCompleted: (item: T) => boolean): T[] {
  return [...items].sort((a, b) => Number(isCompleted(a)) - Number(isCompleted(b)));
}
