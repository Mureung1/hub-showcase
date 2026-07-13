// 수면 관성(sleep inertia): 기상 직후 일시적으로 각성도가 떨어졌다가 서서히 회복되는 현상.
// 계산_모델_리서치.md 원 수식(1장)엔 없던 항 — 검증 중 발견한 누락을 보완(2026-07-14 결정)
import type { SleepPressureSegment } from "./processS.js";

const MAGNITUDE = 0.3; // 기상 직후 최대로 깎이는 정도. 근거 없는 근사치
const TAU = 0.67; // 시간상수(시간). 출처: Jewett & Kronauer(1999), 주관적 각성도 기준

export function sleepInertia(t: number, segment: SleepPressureSegment): number {
  if (segment.isAsleep) return 0;

  const elapsedSinceWake = t - segment.startTime;
  if (elapsedSinceWake < 0) return 0;

  return -MAGNITUDE * Math.exp(-elapsedSinceWake / TAU);
}
