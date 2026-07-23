// #43: 히스토리 캘린더 뷰가 쓰는 순수 함수. task를 등록일(createdAt) 기준으로
// 날짜별로 묶고, 월 달력 그리드에 필요한 날짜 배열을 만든다.
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
} from "date-fns";

export interface TaskLike {
  createdAt: string;
}

// 로컬 달력일 기준 "YYYY-MM-DD" 키. task는 등록일 하루에만 나타난다 —
// completedAt 필드가 없어 완료일 기준 그룹핑은 이번 스코프 밖(checklist.md 참고).
export function dateKey(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd");
}

export function groupTasksByDate<T extends TaskLike>(
  tasks: T[],
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};
  for (const task of tasks) {
    const key = dateKey(task.createdAt);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(task);
  }
  return grouped;
}

// 이번 달의 앞뒤 빈 칸까지 포함해 항상 7의 배수 길이로 반환한다(캘린더 그리드가
// 주 단위 행으로 깔끔하게 나뉘도록 — 일요일 시작 기준).
export function buildMonthGrid(monthDate: Date): Date[] {
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}
