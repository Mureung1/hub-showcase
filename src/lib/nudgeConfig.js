// 넛지 엔진 관련 설정값 모음.
// 매직넘버를 컴포넌트 곳곳에 박지 않고 여기 한 곳에서만 관리한다.
import { getUrgencyBucket } from "./nudgeInterval.js";

// 대기중(waiting) 할일의 시작 예정 시각 경과 여부를 확인하는 간격(ms).
// 도달 즉시 active로 전환하기 위한 가벼운 폴링 주기라 tick보다 짧게 둔다.
export const ACTIVATION_POLL_MS = 3000;

// #44: 데모/발표용 레벨별 지연(ms). nudgeInterval.ts의 실제 서비스 값(분 단위)에
// 배율을 곱한 게 아니라, 시연 가능한 속도로 손으로 정한 별도 표다 — 실제 값을
// 그대로 축소하면 그 사이의 비율 관계까지 그대로 옮겨야 해서 짧은 유형이 D-day
// 임박 시 비현실적으로 짧아지는 문제가 있었다(#44 논의). 긴급도 구간별 상대적
// 압축 관계(far > soon > close > overdue)만 유지하고 절대값은 데모에 맞게 새로 잡았다.
// 정책 근거가 아직 없는 MVP 초기값 — 시연해보고 조정 가능.
export const DEMO_LEVEL_DELAY_MS = {
  far: { 2: 15000, 3: 25000, 4: 40000 },
  soon: { 2: 10000, 3: 18000, 4: 28000 },
  close: { 2: 6000, 3: 12000, 4: 18000 },
  overdue: { 2: 3000, 3: 6000, 4: 10000 },
};

// HomePage.jsx가 호출하는 진입점. currentLevel 기준 다음으로 도달할 레벨(최대 4,
// Lv4는 계속 Lv4 지연을 재사용 — 휴지기 없음, 기존 동작 유지)의 데모 지연(ms)을 반환한다.
// 레벨 1(활성화 직후 첫 체크)은 대기 없이 즉시 발생한다.
export function getDemoNudgeDelayMs(currentLevel, deadline, now = new Date()) {
  const nextLevel = Math.min(currentLevel + 1, 4);
  if (nextLevel === 1) return 0;
  const bucket = getUrgencyBucket(deadline, now);
  return DEMO_LEVEL_DELAY_MS[bucket][nextLevel];
}
