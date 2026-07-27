import { describe, test, expect } from 'vitest';
import { matchReceiptLines } from './matchReceiptLines.js';

// 실제 ingredients.js를 import하지 않고, 함수가 필요로 하는 최소 형태만 담은 mock을 사용해
// 이 순수 함수를 데이터 파일과 독립적으로 테스트한다.
const mockIngredientMap = {
  tofu: { id: 'tofu', name: '두부', category: 'fresh', defaultUnitLabels: ['1모'] },
  onion: { id: 'onion', name: '양파', category: 'fresh', defaultUnitLabels: ['1개'] },
  sweetPotato: { id: 'sweetPotato', name: '고구마', category: 'fresh', defaultUnitLabels: ['1개'] },
};

describe('matchReceiptLines', () => {
  test('정상: 재료명이 포함된 줄은 매칭된다', () => {
    const items = matchReceiptLines(['두부 1,500'], mockIngredientMap);
    expect(items).toEqual([
      {
        rawText: '두부 1,500',
        matchedIngredientId: 'tofu',
        quantityLabel: '1모',
        category: 'fresh',
        matched: true,
        isNew: true,
      },
    ]);
  });

  test('정상: 매칭 안 되는 줄은 unmatched 항목으로 담긴다', () => {
    const items = matchReceiptLines(['수입과자세트'], mockIngredientMap);
    expect(items).toEqual([
      { rawText: '수입과자세트', matchedIngredientId: null, quantityLabel: null, category: null, matched: false },
    ]);
  });

  test('빈 값: lines가 빈 배열이면 결과도 빈 배열', () => {
    expect(matchReceiptLines([], mockIngredientMap)).toEqual([]);
  });

  test('빈 값: 모든 줄이 잡음(날짜/합계 등)이면 결과가 빈 배열', () => {
    const items = matchReceiptLines(['2026.07.23', '합계', '1,500원'], mockIngredientMap);
    expect(items).toEqual([]);
  });

  test('경계값: 매칭 안 되는 줄은 최대 5개까지만 unmatched로 담기고 6번째부터는 버려진다', () => {
    const lines = ['미확인상품A', '미확인상품B', '미확인상품C', '미확인상품D', '미확인상품E', '미확인상품F'];
    const items = matchReceiptLines(lines, mockIngredientMap);
    expect(items).toHaveLength(5);
    expect(items.map((it) => it.rawText)).toEqual(lines.slice(0, 5));
  });

  test('경계값: stem 길이가 2 이상이어야 부분 포함 매칭이 시도된다', () => {
    // "고구마"의 stem이 "고구"(길이 2)면 매칭되지만, "고"(길이 1)면 매칭되지 않는다
    const matched = matchReceiptLines(['고구 1200'], mockIngredientMap);
    expect(matched[0].matched).toBe(true);
    expect(matched[0].matchedIngredientId).toBe('sweetPotato');

    const unmatched = matchReceiptLines(['고 900'], mockIngredientMap);
    expect(unmatched[0].matched).toBe(false);
  });

  test('실패 방지: 이미 매칭된 재료는 같은 줄이 또 나와도 중복 매칭되지 않는다', () => {
    const items = matchReceiptLines(['두부 1,500', '두부 1,600'], mockIngredientMap);
    expect(items[0]).toMatchObject({ matched: true, matchedIngredientId: 'tofu' });
    expect(items[1]).toMatchObject({ matched: false, matchedIngredientId: null });
  });

  test('정상: 줄 앞뒤 공백/개행은 trim 후 정상 매칭된다', () => {
    const items = matchReceiptLines(['  두부  \n'], mockIngredientMap);
    expect(items[0]).toMatchObject({ rawText: '두부', matched: true });
  });

  test('view 옵션: 이미 냉장고에 있는 재료면 isNew:false', () => {
    const items = matchReceiptLines(['두부 1,500'], mockIngredientMap, { tofu: {} });
    expect(items[0].isNew).toBe(false);
  });

  test('view 옵션: view를 생략하면 기본값 {}로 항상 isNew:true', () => {
    const items = matchReceiptLines(['두부 1,500'], mockIngredientMap);
    expect(items[0].isNew).toBe(true);
  });
});
