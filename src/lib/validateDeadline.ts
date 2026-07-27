// 할일 등록 폼의 deadline(D-day)이 제출 가능한 값인지 판단하는 순수 함수.
// 빈 값과 음수를 막는다. 0(오늘 마감)은 유효한 값이다.
export function validateDeadline(deadline: string): boolean {
  if (deadline.trim().length === 0) return false;
  return Number(deadline) >= 0;
}
