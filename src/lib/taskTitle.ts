// 할일 등록 폼의 title이 제출 가능한 값인지 판단하는 순수 함수(wireframe.md 3번
// "제목 미입력 시 제출 차단"). 공백만 있는 값도 미입력으로 취급한다.
export function validateTaskTitle(title: string): boolean {
  return title.trim().length > 0;
}
