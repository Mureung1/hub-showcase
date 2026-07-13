// 오후 슬럼프(post-lunch dip): 점심 여부와 무관하게 이른 오후에 각성도가 살짝 처지는 현상.
// 계산_모델_리서치.md 원 수식(1장)엔 없던 항 — 검증 중 발견한 누락을 보완(2026-07-13 결정)
const CENTER = 14; // 딥의 중심 시각(14시)
const DEPTH = 0.15; // 최대로 파이는 정도. 근거 없는 근사치
const WIDTH = 1; // 딥의 폭(시간). 근거 없는 근사치

export function lunchDip(t: number): number {
  const hoursFromCenter = t - CENTER;
  return -DEPTH * Math.exp(-(hoursFromCenter ** 2) / (2 * WIDTH ** 2));
}
