export function calculateLevel(skipCount: number): number {
  return Math.min(skipCount, 4);
}
