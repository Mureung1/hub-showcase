// 남은 날짜를 "얼마나 급한가" 네 단계로 나눈다.
// 화면에서 D-day 를 색으로 구분하는 데 쓴다. 숫자만 보고 급한지 판단하게 하지 않으려는 것이다.
//
// 경계는 시험 준비 감각에 맞췄다. 3일 이내는 오늘 당장 손대야 하는 범위,
// 일주일 이내는 이번 주에 들어온 범위, 그보다 멀면 아직 여유가 있다.
const URGENT_MAX_DAYS = 3;
const SOON_MAX_DAYS = 7;

export function getDdayTone(daysUntil) {
  if (daysUntil === null || daysUntil === undefined) {
    return "none";
  }

  if (daysUntil < 0) {
    return "past";
  }

  if (daysUntil <= URGENT_MAX_DAYS) {
    return "urgent";
  }

  if (daysUntil <= SOON_MAX_DAYS) {
    return "soon";
  }

  return "normal";
}
