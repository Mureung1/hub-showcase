import { SOON_THRESHOLD } from "./data";

/**
 * 남은 일수(dday)로 유통기한 상태를 파생한다.
 * - dday > 임계값        → 신선
 * - 0 < dday ≤ 임계값    → 임박
 * - dday ≤ 0            → 만료
 */
export function statusFromDday(dday, threshold = SOON_THRESHOLD) {
  if (dday <= 0) return "만료";
  if (dday <= threshold) return "임박";
  return "신선";
}

/** 남은 일수를 "D-3 / D-day / D+1" 표기로 */
export function ddayLabel(dday) {
  if (dday === 0) return "D-day";
  if (dday > 0) return `D-${dday}`;
  return `D+${Math.abs(dday)}`;
}
