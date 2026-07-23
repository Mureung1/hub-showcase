import { endOfWeek, isWithinInterval, parseISO, startOfWeek } from 'date-fns';

/**
 * "이번 주 마감 뭐 있어?" 같은 기간 기반 조회(A-2)의 기초 필터.
 * 주는 월요일 시작(ISO week)으로 판단한다.
 */
export function filterByThisWeek<T>(items: T[], getDate: (item: T) => string, today: string): T[] {
  const todayDate = parseISO(today);
  const interval = {
    start: startOfWeek(todayDate, { weekStartsOn: 1 }),
    end: endOfWeek(todayDate, { weekStartsOn: 1 }),
  };
  return items.filter((item) => isWithinInterval(parseISO(getDate(item)), interval));
}
