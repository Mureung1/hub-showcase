import { describe, expect, it } from 'vitest';
import { filterPurchasesByActivity } from './filterPurchasesByActivity';

const purchases = [
  { id: 1, status: 'RECRUITING' },
  { id: 2, status: 'COMPLETED' },
  { id: 3, status: 'ORDERED' },
  { id: 4, status: 'WAITING_PICKUP' },
  { id: 5, status: 'FINISHED' },
];

describe('filterPurchasesByActivity', () => {
  it('전체 필터에서는 모든 공동구매를 반환한다', () => {
    expect(filterPurchasesByActivity(purchases, 'all')).toEqual(purchases);
  });

  it('진행 중 필터에서는 RECRUITING 상태만 반환한다', () => {
    expect(filterPurchasesByActivity(purchases, 'recruiting')).toEqual([
      { id: 1, status: 'RECRUITING' },
    ]);
  });

  it('마감 필터에서는 RECRUITING이 아닌 모든 상태를 반환한다', () => {
    expect(filterPurchasesByActivity(purchases, 'closed')).toEqual([
      { id: 2, status: 'COMPLETED' },
      { id: 3, status: 'ORDERED' },
      { id: 4, status: 'WAITING_PICKUP' },
      { id: 5, status: 'FINISHED' },
    ]);
  });

  it('빈 목록은 어떤 필터에서도 빈 배열을 반환한다', () => {
    expect(filterPurchasesByActivity([], 'all')).toEqual([]);
    expect(filterPurchasesByActivity([], 'recruiting')).toEqual([]);
    expect(filterPurchasesByActivity([], 'closed')).toEqual([]);
  });

  it('진행 중인 공동구매가 없으면 진행 중 필터는 빈 배열을 반환한다', () => {
    expect(filterPurchasesByActivity(purchases.slice(1), 'recruiting')).toEqual([]);
  });

  it('마감된 공동구매가 없으면 마감 필터는 빈 배열을 반환한다', () => {
    expect(filterPurchasesByActivity(purchases.slice(0, 1), 'closed')).toEqual([]);
  });

  it('알 수 없는 필터 값은 전체 목록을 반환한다', () => {
    expect(filterPurchasesByActivity(purchases, 'unknown')).toEqual(purchases);
  });
});
