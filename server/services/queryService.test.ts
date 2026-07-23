import { describe, it, expect } from 'vitest';
import { filterByThisWeek } from './queryService';

type Item = { id: string; date: string };

const item = (id: string, date: string): Item => ({ id, date });

describe('filterByThisWeek', () => {
  it('이번 주 안의 항목은 포함한다', () => {
    const items = [item('a', '2026-07-22')]; // 오늘(화, 07-21)이 속한 주의 수요일
    expect(filterByThisWeek(items, (i) => i.date, '2026-07-21')).toEqual(items);
  });

  it('지난주 항목은 제외한다', () => {
    const items = [item('a', '2026-07-19')]; // 지난주 일요일
    expect(filterByThisWeek(items, (i) => i.date, '2026-07-21')).toEqual([]);
  });

  it('다음 주 항목은 제외한다', () => {
    const items = [item('a', '2026-07-27')]; // 다음주 월요일
    expect(filterByThisWeek(items, (i) => i.date, '2026-07-21')).toEqual([]);
  });

  it('이번 주 월요일(경계값)은 포함한다', () => {
    const items = [item('a', '2026-07-20')];
    expect(filterByThisWeek(items, (i) => i.date, '2026-07-21')).toEqual(items);
  });

  it('이번 주 일요일(경계값)은 포함한다', () => {
    const items = [item('a', '2026-07-26')];
    expect(filterByThisWeek(items, (i) => i.date, '2026-07-21')).toEqual(items);
  });

  it('빈 배열을 넣으면 빈 배열을 반환한다', () => {
    expect(filterByThisWeek([] as Item[], (i) => i.date, '2026-07-21')).toEqual([]);
  });

  it('월 경계를 넘는 주에서도 정상 판정한다', () => {
    // 오늘 2026-07-30(목) → 이번 주: 07-27(월) ~ 08-02(일), 월 경계를 넘는다
    const items = [
      item('prev-month', '2026-07-27'),
      item('next-month', '2026-08-02'),
      item('out-of-week', '2026-08-03'),
    ];
    const result = filterByThisWeek(items, (i) => i.date, '2026-07-30');
    expect(result.map((i) => i.id)).toEqual(['prev-month', 'next-month']);
  });
});
