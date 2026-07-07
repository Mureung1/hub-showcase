import { THRESHOLDS } from "./data";

/**
 * 남은 일수(dday)로 유통기한 상태를 4단계로 파생한다.
 * - dday < 0           → 만료
 * - 0 ≤ dday ≤ soon    → 임박
 * - soon < dday ≤ warn → 주의
 * - dday > warn        → 정상
 */
export function statusFromDday(dday, { soon, warn } = THRESHOLDS) {
  if (dday < 0) return "만료";
  if (dday <= soon) return "임박";
  if (dday <= warn) return "주의";
  return "정상";
}

/** 남은 일수를 "D-3 / D-day / D+1" 표기로 */
export function ddayLabel(dday) {
  if (dday === 0) return "D-day";
  if (dday > 0) return `D-${dday}`;
  return `D+${Math.abs(dday)}`;
}
