// 기획서.md 6.4 "목표 각성 시각 = 시험 시작 시각 − 여유시간(기본 15~20분)"
// 여유시간을 고려해, 실제로 각성도가 최고여야 하는 시각을 역산한다(단일 시험 기준).
// 이동시간은 계산에 넣지 않는다 — 정보 입력 화면의 안내 문구를 보고 사용자가 스스로 판단해 조정하도록 함(2026-07-15 결정).
const DEFAULT_BUFFER_HOURS = 20 / 60; // 여유시간 기본값 20분. 기획서.md 6.4(15~20분 권장)의 상한값 채택

/**
 * @param examStartTime 시험 시작 시각. 자정 기준 경과 시간(0~24+)
 * @param bufferHours 기상 후 준비 등에 쓰는 여유시간(시간). 기본값 20분
 */
export function targetAlertnessTime(examStartTime: number, bufferHours: number = DEFAULT_BUFFER_HOURS): number {
  return examStartTime - bufferHours;
}
