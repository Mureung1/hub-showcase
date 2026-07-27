import { describe, test, expect } from 'vitest';
import { formatDday, ddayValue, planDeduction, deleteFridgeItem } from './store.js';

test('formatDday: 오늘 이후 날짜는 D-n', () => {
  process.env.DEMO_TODAY = '2026-07-21';
  expect(formatDday('2026-07-23')).toBe('D-2');
});

test('formatDday: 오늘 이전 날짜는 D+n', () => {
  process.env.DEMO_TODAY = '2026-07-21';
  expect(formatDday('2026-07-19')).toBe('D+2');
});

test('formatDday: 오늘이면 D-0', () => {
  process.env.DEMO_TODAY = '2026-07-21';
  expect(formatDday('2026-07-21')).toBe('D-0');
});

test('ddayValue: D-n은 양수로, D+n은 음수로 뒤집는다', () => {
  expect(ddayValue('D-2')).toBe(2);
  expect(ddayValue('D+3')).toBe(-3);
  expect(ddayValue('D-0')).toBe(0);
});

describe('planDeduction', () => {
  test('정상: 재고보다 적게 차감하면 update로 잔량만 줄인다', () => {
    const currentFridge = { onion: { items: [{ dbId: 1, qtyAmount: 5, expiry: 'D-3' }] } };
    const ops = planDeduction(currentFridge, 'onion', 2);
    expect(ops).toEqual([{ action: 'update', dbId: 1, qtyAmount: 3 }]);
  });

  test('정상: 재고와 정확히 같은 양을 차감하면 delete', () => {
    const currentFridge = { onion: { items: [{ dbId: 1, qtyAmount: 5, expiry: 'D-3' }] } };
    const ops = planDeduction(currentFridge, 'onion', 5);
    expect(ops).toEqual([{ action: 'delete', dbId: 1 }]);
  });

  test('정상: 여러 항목에 걸쳐 차감할 땐 유통기한 빠른 순으로 소진한다', () => {
    const currentFridge = {
      onion: {
        items: [
          { dbId: 2, qtyAmount: 3, expiry: 'D-10' },
          { dbId: 1, qtyAmount: 2, expiry: 'D-1' },
        ],
      },
    };
    const ops = planDeduction(currentFridge, 'onion', 4);
    // D-1(dbId:1)이 먼저 전량 소진되고, 남은 2는 D-10(dbId:2)에서 update
    expect(ops).toEqual([
      { action: 'delete', dbId: 1 },
      { action: 'update', dbId: 2, qtyAmount: 1 },
    ]);
  });

  test('빈 값: use가 0이면 빈 배열', () => {
    const currentFridge = { onion: { items: [{ dbId: 1, qtyAmount: 5 }] } };
    expect(planDeduction(currentFridge, 'onion', 0)).toEqual([]);
  });

  test('빈 값: use가 undefined면 빈 배열', () => {
    const currentFridge = { onion: { items: [{ dbId: 1, qtyAmount: 5 }] } };
    expect(planDeduction(currentFridge, 'onion', undefined)).toEqual([]);
  });

  test('빈 값: 해당 id에 items가 없으면 빈 배열', () => {
    expect(planDeduction({}, 'onion', 2)).toEqual([]);
  });

  test('경계값: use가 전체 재고 합과 정확히 같으면 마지막 항목까지 전부 delete', () => {
    const currentFridge = {
      onion: {
        items: [
          { dbId: 1, qtyAmount: 2, expiry: 'D-1' },
          { dbId: 2, qtyAmount: 3, expiry: 'D-5' },
        ],
      },
    };
    const ops = planDeduction(currentFridge, 'onion', 5);
    expect(ops).toEqual([
      { action: 'delete', dbId: 1 },
      { action: 'delete', dbId: 2 },
    ]);
  });

  test('실패/방어: use가 전체 재고보다 많아도 있는 만큼만 소진하고 에러 없이 끝난다', () => {
    const currentFridge = { onion: { items: [{ dbId: 1, qtyAmount: 2, expiry: 'D-1' }] } };
    const ops = planDeduction(currentFridge, 'onion', 999);
    expect(ops).toEqual([{ action: 'delete', dbId: 1 }]);
  });

  test('회귀: "즉석밥 1개"처럼 개수 단위 재고는 소수(0.5)로 요청해도 1개 단위로 올림 차감한다', () => {
    // 레시피가 "1/2컵"(parseAmt -> 0.5)을 요구해도, 즉석밥은 낱개 포장이라 반 개를 뺄 수 없다.
    // 수정 전엔 qtyAmount가 5.67개처럼 소수로 남아 실제 재고와 어긋났다(2026-07-24 발견).
    const currentFridge = { rice: { items: [{ dbId: 1, qtyAmount: 6, qtyUnit: '개', expiry: 'D-3' }] } };
    const ops = planDeduction(currentFridge, 'rice', 0.5);
    expect(ops).toEqual([{ action: 'update', dbId: 1, qtyAmount: 5 }]);
  });

  test('정상: g 단위(연속량)는 개수 단위와 달리 소수 그대로 차감한다', () => {
    const currentFridge = { pork: { items: [{ dbId: 1, qtyAmount: 300, qtyUnit: 'g', expiry: 'D-3' }] } };
    const ops = planDeduction(currentFridge, 'pork', 0.5);
    expect(ops).toEqual([{ action: 'update', dbId: 1, qtyAmount: 299.5 }]);
  });

  test('실패/방어: dbId가 없는 항목은 건너뛴다', () => {
    const currentFridge = {
      onion: {
        items: [
          { qtyAmount: 2, expiry: 'D-1' }, // dbId 없음 -> skip
          { dbId: 2, qtyAmount: 3, expiry: 'D-5' },
        ],
      },
    };
    const ops = planDeduction(currentFridge, 'onion', 2);
    expect(ops).toEqual([{ action: 'update', dbId: 2, qtyAmount: 1 }]);
  });

  test('경계값: qtyAmount가 없는 항목(가공식품류)은 무조건 delete', () => {
    const currentFridge = { spam: { items: [{ dbId: 1, expiry: 'D-1' }] } };
    const ops = planDeduction(currentFridge, 'spam', 1);
    expect(ops).toEqual([{ action: 'delete', dbId: 1 }]);
  });
});

// TDD red 단계: 존재하지 않는 재료를 삭제하면 404를 내려줄 수 있도록 store가 false를
// 반환해야 한다는 기대를 먼저 적어둔다. 현재 deleteFridgeItem은 존재 여부를 확인하지 않고
// 항상 true를 반환하므로(store.js:236) 이 테스트는 지금은 실패해야 정상이다.
describe('deleteFridgeItem (TDD)', () => {
  test('존재하지 않는 id를 삭제하면 false를 반환해야 한다', async () => {
    const result = await deleteFridgeItem('no-such-ingredient');
    expect(result).toBe(false);
  });
});
