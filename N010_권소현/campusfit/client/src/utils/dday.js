// 마감일이 365일 넘게 남은 경우(온통청년 API가 신청기간을 안 줘서 999로 고정한 것 포함)는
// 실제로 상시모집인지 데이터가 없는 건지 구분할 수 없어 "마감일 미정"으로 표시한다.
const ROLLING_THRESHOLD = 365;

export function isRolling(dDay) {
  return dDay > ROLLING_THRESHOLD;
}

export function formatDDay(dDay) {
  return isRolling(dDay) ? "마감일 미정" : `D-${dDay}`;
}
