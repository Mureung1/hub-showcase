export const MIN_FOCUS_SECONDS_FOR_RELIEF = 600;
export const MAX_FOCUS_SECONDS_FOR_RELIEF = 12 * 60 * 60;

export function calculateLevel(skipCount: number): number {
  return Math.min(skipCount, 4);
}

export function normalizeStoppedDurationSeconds(value: unknown): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > MAX_FOCUS_SECONDS_FOR_RELIEF
  ) {
    return null;
  }

  return value;
}

export function calculateStoppedRelief(
  skipCount: number,
  durationSeconds: number | null,
) {
  const currentLevel = calculateLevel(skipCount);
  if (
    durationSeconds === null ||
    durationSeconds < MIN_FOCUS_SECONDS_FOR_RELIEF
  ) {
    return {
      skipCount,
      level: currentLevel,
      reliefApplied: false,
    };
  }

  const nextLevel = Math.max(currentLevel - 1, 0);
  return {
    skipCount: nextLevel,
    level: nextLevel,
    reliefApplied: nextLevel < currentLevel,
  };
}
