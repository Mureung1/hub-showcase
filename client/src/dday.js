// ── 납부일까지 남은 일수 계산 ──
// 입력: due_day (1~31), today (기준 날짜. 생략하면 오늘)
// 출력: 남은 일수(숫자). 오늘이 납부일이면 0
//
// 규칙
//  ① 이번 달 납부일이 이미 지났으면 다음 달로 계산한다
//  ② 그 달에 없는 날이면 말일로 당긴다 (2월 31일 → 2월 28일)

export function getDaysUntil(due_day, today = new Date()) {
  // 1. 시·분·초를 떼어내고 '날짜'만 남긴다
  //    이걸 안 하면 오후 3시에 실행했을 때 소수점 하루가 생긴다
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // 2. 이번 달 납부일을 목표로 잡는다
  let target = makeDueDate(base.getFullYear(), base.getMonth(), due_day);

  // 3. 이미 지났으면 다음 달 납부일로 바꾼다
  if (target < base) {
    target = makeDueDate(base.getFullYear(), base.getMonth() + 1, due_day);
  }

  // 4. 두 날짜의 차이를 '일수'로 바꾼다
  const oneDay = 1000 * 60 * 60 * 24; // 하루를 밀리초로
  return Math.round((target - base) / oneDay);
}

// 해당 월의 납부일 날짜를 만든다.
// 그 달에 없는 날이면 말일로 당긴다.
function makeDueDate(year, month, due_day) {
  // 다음 달 0일 = 이번 달 말일 (자바스크립트 관용 표현)
  const lastDay = new Date(year, month + 1, 0).getDate();

  // 31일을 원해도 그 달 말일을 넘지 못하게 한다
  const day = Math.min(due_day, lastDay);

  return new Date(year, month, day);
}
// 남은 일수를 화면에 쓸 글자로 바꾼다
//  0 → "오늘"   1 → "내일"   그 외 → "D-5"
export function getDdayLabel(days) {
  if (days === 0) return "오늘";
  if (days === 1) return "내일";
  return `D-${days}`;
}