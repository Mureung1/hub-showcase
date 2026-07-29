// #44: "다음 레벨까지 기다리는 시간"을 마감 긴급도(D-day) × 도달할 레벨로 계산한다.
// type(할일 유형) 기준 안은 폐기했다 — type은 이미 마이크로태스크 생성(microtaskTemplates.js)에
// 쓰이고 있어 "유형별 평균 소요시간"이라는 근거 없는 가정을 얹지 않기 위해서다.
import { differenceInCalendarDays } from "date-fns";

export type UrgencyBucket = "far" | "soon" | "close" | "overdue";

// deadline이 없거나 유효하지 않으면 가장 완화된 구간(far)으로 안전하게 폴백한다 —
// 데이터가 없다고 더 급하게 재촉할 근거는 없기 때문이다.
export function getUrgencyBucket(
  deadline: string | Date | null | undefined,
  now: Date = new Date(),
): UrgencyBucket {
  if (!deadline) return "far";
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return "far";

  const daysLeft = differenceInCalendarDays(date, now);
  if (daysLeft >= 7) return "far";
  if (daysLeft >= 3) return "soon";
  if (daysLeft >= 1) return "close";
  return "overdue";
}

// (긴급도 구간) × (도달할 레벨) → 그 레벨까지 기다리는 시간(분).
// 정책 근거가 아직 없는 MVP 초기값 — 실제 서비스 튜닝 전까지는 잠정치다.
// 레벨이 높을수록(Lv2→Lv3→Lv4) 더 자주 개입해야 하므로 값은 감소해야 한다 — 이전에
// 반대로(레벨이 높을수록 값이 커지도록) 구현돼 있던 버그를 여기서 바로잡았다.
const LEVEL_DELAY_MINUTES: Record<UrgencyBucket, Record<number, number>> = {
  far: { 2: 120, 3: 60, 4: 30 },
  soon: { 2: 60, 3: 40, 4: 20 },
  close: { 2: 30, 3: 20, 4: 10 },
  overdue: { 2: 15, 3: 10, 4: 5 },
};

// 레벨 1(활성화 직후 첫 체크)은 모든 구간에서 대기 없이 즉시 발생한다(#44 설계 결정).
// 정의되지 않은 레벨(0, 5 이상 등)은 안전하게 0을 반환한다.
export function getLevelDelayMinutes(nextLevel: number, bucket: UrgencyBucket): number {
  if (nextLevel === 1) return 0;
  return LEVEL_DELAY_MINUTES[bucket]?.[nextLevel] ?? 0;
}

// HomePage.jsx가 호출하는 진입점. currentLevel(지금 도달해 있는 레벨)을 받아
// 다음으로 도달할 레벨(최대 4, Lv4는 계속 Lv4 지연을 재사용— 휴지기 없음, 기존 동작 유지)
// 기준으로 대기 시간(분)을 반환한다.
export function getNextCheckDelayMinutes(
  currentLevel: number,
  deadline: string | Date | null | undefined,
  now: Date = new Date(),
): number {
  const nextLevel = Math.min(currentLevel + 1, 4);
  const bucket = getUrgencyBucket(deadline, now);
  return getLevelDelayMinutes(nextLevel, bucket);
}
