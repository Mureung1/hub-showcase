import { describe, test, expect } from 'vitest';
import {
  parseAmt, formatAmtText, extractUnit, ingHave, getMissingInfo,
  calculateRecipeDifficulty, snapToNiceFraction, lowStockIdsOf,
  isPantryOrVague, normalizeIngredientKey, generateImminentRescueSet,
  buildDeductionState,
} from './fridgeLogic.js';

test('parseAmt: "300g"은 그램 단위 연속량으로 파싱', () => {
  expect(parseAmt('300g')).toEqual({ val: 300, isGram: true });
});

test('parseAmt: 0.2g처럼 값이 작아도 0으로 뭉개지지 않는다', () => {
  // 9일차 발견 버그(소금 0.2g)의 회귀 방지 — parseInt(...) || fallback 패턴이 아니어야 함
  expect(parseAmt('0.2g')).toEqual({ val: 0.2, isGram: true });
});

test('parseAmt: 분수 표현("1/2개")은 소수로 변환', () => {
  expect(parseAmt('1/2개')).toEqual({ val: 0.5, isGram: false });
});

test('parseAmt: 빈 값은 기본 1개 취급', () => {
  expect(parseAmt('')).toEqual({ val: 1, isGram: false });
});

test('extractUnit: 숫자·분수·공백을 제거하고 단위만 남긴다', () => {
  expect(extractUnit('8쪽')).toBe('쪽');
  expect(extractUnit('1/2단')).toBe('단');
});

test('extractUnit: 원문이 없으면 "단위"로 폴백', () => {
  expect(extractUnit(null)).toBe('단위');
});

test('formatAmtText: 그램 단위는 formatGramQty 규칙을 따른다', () => {
  expect(formatAmtText(0.2, true, '0.2g')).toBe('0.2g');
  expect(formatAmtText(300, true, '300g')).toBe('300g');
});

test('formatAmtText: "약간" 같은 모호한 표현은 원문 그대로', () => {
  expect(formatAmtText(2, false, '약간')).toBe('약간');
});

test('formatAmtText: 개수 단위는 소수를 계량 가능한 분수로 스냅', () => {
  expect(formatAmtText(2, false, '1개')).toBe('2개');
});

test('ingHave: 재고에 있는 재료면 true', () => {
  const fridge = { tofu: { items: [{ qtyAmount: 1 }] } };
  expect(ingHave(fridge, { id: 'tofu' })).toBe(true);
});

test('ingHave: 재고에 없으면 false', () => {
  const fridge = {};
  expect(ingHave(fridge, { id: 'tofu' })).toBe(false);
});

test('ingHave: untracked 재료(조미료 등)는 항상 있는 것으로 취급', () => {
  expect(ingHave({}, { untracked: true })).toBe(true);
});

test('getMissingInfo: 재고 충분하면 제외, 부족/미보유는 포함, 상비재료는 항상 제외', () => {
  const view = { tofu: { items: [{ qtyAmount: 2 }] } };
  const recipe = {
    ingredients: [
      { id: 'onion', name: '양파', amt: '1개' }, // 재고에 아예 없음 -> 포함
      { id: 'tofu', name: '두부', amt: '1모' }, // 재고 충분(2 >= 1) -> 제외
      { name: '소금', amt: '약간' }, // 상비재료 -> 항상 제외
    ],
  };

  const missing = getMissingInfo(view, recipe, 1);

  expect(missing.size).toBe(1);
  expect(missing.get('onion')).toEqual({ qty: 1, isGram: false, label: '양파', originalAmt: '1개' });
});

describe('calculateRecipeDifficulty', () => {
  test('정상: steps 있고 score < 10이면 beginner (재료2 x2 + 과정1 = 5)', () => {
    const recipe = { ingredients: [{ id: 'a' }, { id: 'b' }], steps: [{ text: '볶는다' }] };
    expect(calculateRecipeDifficulty(recipe)).toEqual({ level: 'beginner', levelLabel: '🟢 쉬움' });
  });

  test('정상: steps 있고 10 <= score < 14이면 mid (재료3 x2 + 과정4 = 10)', () => {
    const recipe = {
      ingredients: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      steps: [{}, {}, {}, {}],
    };
    expect(calculateRecipeDifficulty(recipe)).toEqual({ level: 'mid', levelLabel: '🟡 보통' });
  });

  test('정상: steps 있고 score >= 14이면 expert (재료5 x2 + 과정5 = 15)', () => {
    const recipe = {
      ingredients: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }],
      steps: [{}, {}, {}, {}, {}],
    };
    expect(calculateRecipeDifficulty(recipe)).toEqual({ level: 'expert', levelLabel: '🔴 어려움' });
  });

  test('폴백: steps=0이고 level이 있으면 계산 없이 그대로 반환 (beginner)', () => {
    const recipe = { ingredients: [], steps: [], level: 'beginner' };
    expect(calculateRecipeDifficulty(recipe)).toEqual({ level: 'beginner', levelLabel: '🟢 쉬움' });
  });

  test('폴백: steps=0이고 level=mid', () => {
    const recipe = { ingredients: [], steps: [], level: 'mid' };
    expect(calculateRecipeDifficulty(recipe)).toEqual({ level: 'mid', levelLabel: '🟡 보통' });
  });

  test('폴백: steps=0이고 level=expert', () => {
    const recipe = { ingredients: [], steps: [], level: 'expert' };
    expect(calculateRecipeDifficulty(recipe)).toEqual({ level: 'expert', levelLabel: '🔴 어려움' });
  });

  test('빈 값: ingredients/steps/level 전부 없어도 에러 없이 score 계산으로 처리 (beginner)', () => {
    expect(calculateRecipeDifficulty({})).toEqual({ level: 'beginner', levelLabel: '🟢 쉬움' });
  });

  test('경계값: score 정확히 9는 beginner, 10은 mid', () => {
    // 재료3(x2=6) + 과정3 = 9
    const nine = { ingredients: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], steps: [{}, {}, {}] };
    expect(calculateRecipeDifficulty(nine).level).toBe('beginner');

    // 재료3(x2=6) + 과정4 = 10
    const ten = { ingredients: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], steps: [{}, {}, {}, {}] };
    expect(calculateRecipeDifficulty(ten).level).toBe('mid');
  });

  test('경계값: score 정확히 13은 mid, 14는 expert', () => {
    // 재료5(x2=10) + 과정3 = 13
    const thirteen = {
      ingredients: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }],
      steps: [{}, {}, {}],
    };
    expect(calculateRecipeDifficulty(thirteen).level).toBe('mid');

    // 재료5(x2=10) + 과정4 = 14
    const fourteen = {
      ingredients: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }],
      steps: [{}, {}, {}, {}],
    };
    expect(calculateRecipeDifficulty(fourteen).level).toBe('expert');
  });

  test('실패(엣지): steps=0인데 level이 알 수 없는 값이면 폴백을 타지 않고 score 계산으로 넘어간다', () => {
    const recipe = { ingredients: [], steps: [], level: 'unknown' };
    // ingCount=0, stepCount=0 -> score=0 -> beginner (level 폴백 3분기 중 어디에도 안 걸림)
    expect(calculateRecipeDifficulty(recipe)).toEqual({ level: 'beginner', levelLabel: '🟢 쉬움' });
  });
});

describe('snapToNiceFraction', () => {
  test('정상: 정확히 딱 떨어지는 분수(2.5 -> 1/2)', () => {
    expect(snapToNiceFraction(2.5)).toEqual({ whole: 2, fracLabel: '1/2' });
  });

  test('정상: 정수(3.0)는 분수 라벨 없이 그대로', () => {
    expect(snapToNiceFraction(3)).toEqual({ whole: 3, fracLabel: '' });
  });

  test('빈 값/경계: 0은 whole 0, 분수 없음', () => {
    expect(snapToNiceFraction(0)).toEqual({ whole: 0, fracLabel: '' });
  });

  test('경계값: frac이 1에 매우 가까우면(2.99) 다음 정수로 올림', () => {
    expect(snapToNiceFraction(2.99)).toEqual({ whole: 3, fracLabel: '' });
  });

  test('경계값: 두 후보의 정중앙 값은 reduce 특성상 더 먼저 나온 후보 쪽으로 스냅된다', () => {
    // 1/8(0.125)과 1/4(0.25)의 중간은 0.1875 — |0.1875-0.125| === |0.1875-0.25| (동률)
    // reduce는 strict '<' 비교라 동률이면 기존(앞쪽, 1/8)을 유지한다.
    expect(snapToNiceFraction(2.1875)).toEqual({ whole: 2, fracLabel: '1/8' });
  });
});

describe('lowStockIdsOf', () => {
  test('정상: g 단위, 총량 200(>150)이면 제외', () => {
    const view = { salt: { items: [{ qtyAmount: 200, qtyUnit: 'g' }] } };
    expect(lowStockIdsOf(view)).toEqual([]);
  });

  test('정상: g 단위, 총량 100(<=150)이면 포함', () => {
    const view = { salt: { items: [{ qtyAmount: 100, qtyUnit: 'g' }] } };
    expect(lowStockIdsOf(view)).toEqual(['salt']);
  });

  test('정상: 개수 단위, 총량 2(>1)면 제외', () => {
    const view = { egg: { items: [{ qtyAmount: 2, qtyUnit: '개' }] } };
    expect(lowStockIdsOf(view)).toEqual([]);
  });

  test('정상: 개수 단위, 총량 1(<=1)이면 포함', () => {
    const view = { egg: { items: [{ qtyAmount: 1, qtyUnit: '개' }] } };
    expect(lowStockIdsOf(view)).toEqual(['egg']);
  });

  test('빈 값: view가 빈 객체면 빈 배열', () => {
    expect(lowStockIdsOf({})).toEqual([]);
  });

  test('빈 값: items가 빈 배열이면 제외', () => {
    const view = { egg: { items: [] } };
    expect(lowStockIdsOf(view)).toEqual([]);
  });

  test('경계값: g 단위 총량 정확히 150은 포함', () => {
    const view = { salt: { items: [{ qtyAmount: 150, qtyUnit: 'g' }] } };
    expect(lowStockIdsOf(view)).toEqual(['salt']);
  });

  test('경계값: 개수 단위 총량 정확히 1은 포함', () => {
    const view = { egg: { items: [{ qtyAmount: 1, qtyUnit: '개' }] } };
    expect(lowStockIdsOf(view)).toEqual(['egg']);
  });

  test('경계값: "g 직접입력" 단위도 g 취급되어 150 기준 적용', () => {
    const view = { flour: { items: [{ qtyAmount: 100, qtyUnit: 'g 직접입력' }] } };
    expect(lowStockIdsOf(view)).toEqual(['flour']);
  });

  test('실패/방어: qtyAmount가 없는 item은 1개로 취급해 합산', () => {
    const view = { egg: { items: [{ qtyUnit: '개' }] } }; // qtyAmount undefined -> 1
    expect(lowStockIdsOf(view)).toEqual(['egg']);
  });
});

describe('isPantryOrVague / normalizeIngredientKey', () => {
  test('normalizeIngredientKey 정상: id가 있으면 그대로 반환', () => {
    expect(normalizeIngredientKey({ id: 'onion' })).toBe('onion');
  });

  test('normalizeIngredientKey 정상: 수식어 제거("채썬 당근" -> "당근")', () => {
    expect(normalizeIngredientKey({ name: '채썬 당근' })).toBe('당근');
  });

  test('normalizeIngredientKey 정상: "다진마늘"/"다진파"는 일반 수식어 제거 대신 표준 재료 id로 매핑된다', () => {
    // 레시피 재료명이 "다진 마늘"/"다진 파"처럼 공백 포함으로 오면 공백 제거 후 이 특례에 걸려
    // 냉장고 재고(id 기반)와 실제로 대조 가능한 id로 매핑된다 — 일반 수식어 제거만으로는
    // "마늘"/"파"라는 이름 문자열만 남아 재고의 garlic/pa id와 매칭되지 않는 문제를 막기 위함.
    expect(normalizeIngredientKey({ name: '다진 마늘' })).toBe('garlic');
    expect(normalizeIngredientKey({ name: '다진 파' })).toBe('pa');
  });

  test('normalizeIngredientKey 빈 값: name이 없으면 빈 문자열', () => {
    expect(normalizeIngredientKey({})).toBe('');
  });

  test('normalizeIngredientKey 경계값: 이름이 수식어 자체와 완전히 같으면 제거하지 않는다', () => {
    // length > w.length 조건 때문에 이름 전체가 수식어와 같으면 그대로 유지
    expect(normalizeIngredientKey({ name: '다진' })).toBe('다진');
  });

  test('isPantryOrVague 정상: untracked는 true', () => {
    expect(isPantryOrVague({ untracked: true })).toBe(true);
  });

  test('isPantryOrVague 정상: PANTRY_STAPLES 포함(소금)이면 true', () => {
    expect(isPantryOrVague({ name: '소금' })).toBe(true);
  });

  test('isPantryOrVague 정상: amt에 VAGUE_AMOUNTS 단어가 있으면 true', () => {
    expect(isPantryOrVague({ id: 'onion', amt: '약간' })).toBe(true);
  });

  test('isPantryOrVague 정상: 일반 재료는 false', () => {
    expect(isPantryOrVague({ id: 'onion', amt: '1개' })).toBe(false);
  });

  test('isPantryOrVague 빈 값: key가 빈 문자열이 되면 true', () => {
    expect(isPantryOrVague({ amt: '1개' })).toBe(true); // id도 name도 없어 key===''
  });

  test('isPantryOrVague 경계값: 상비재료 이름을 부분 포함하지만 완전 일치는 아니면 false', () => {
    // PANTRY_STAPLES.includes는 완전 일치 검사라 "소금물"은 상비재료로 오탐되지 않는다
    expect(isPantryOrVague({ name: '소금물' })).toBe(false);
  });
});

describe('buildDeductionState', () => {
  test('회귀: 개수 단위 재고는 레시피가 소수(1/2컵 등)를 요구해도 1개 단위로 올림한다', () => {
    const fridge = { rice: { items: [{ qtyAmount: 6, qtyUnit: '개' }] } };
    const recipe = { ingredients: [{ id: 'rice', amt: '1/2컵' }], addons: [] };
    const state = buildDeductionState(fridge, recipe, []);
    expect(state).toEqual([{ id: 'rice', use: 1, max: 6, fixed: false, addon: false, unit: '개' }]);
  });

  test('정상: g 단위(연속량)는 소수 요구량을 그대로 쓴다', () => {
    const fridge = { pork: { items: [{ qtyAmount: 300, qtyUnit: 'g' }] } };
    const recipe = { ingredients: [{ id: 'pork', amt: '150.5g' }], addons: [] };
    const state = buildDeductionState(fridge, recipe, []);
    expect(state).toEqual([{ id: 'pork', use: 150.5, max: 300, fixed: false, addon: false, unit: 'g' }]);
  });
});

describe('generateImminentRescueSet (TDD)', () => {
  const recipes = {
    rcp1: { name: '돼지고기 김치찌개', ingredients: [{ id: 'pork' }, { id: 'kimchi' }, { id: 'pa' }], steps: [{}] },
    rcp2: { name: '두부 대파 조림', ingredients: [{ id: 'tofu' }, { id: 'pa' }], steps: [{}] },
    rcp3: { name: '계란말이', ingredients: [{ id: 'egg' }, { id: 'pa' }], steps: [{}] },
    rcp4: { name: '돼지고기 두부전', ingredients: [{ id: 'pork' }, { id: 'tofu' }], steps: [{}] },
  };

  test('임박 재료가 없을 때 빈 결과와 안내 메시지를 반환한다', () => {
    const view = {
      pork: { items: [{ qtyAmount: 1, expiry: 'D-10', imminent: false }] },
    };
    const result = generateImminentRescueSet(view, recipes, 3);
    expect(result.recipeIds).toEqual([]);
    expect(result.coveredIds).toEqual([]);
    expect(result.message).toContain('임박한 재료가 없어요');
  });

  test('최소 끼니 수(최소 요리 개수) 조합을 우선 선택한다', () => {
    // 임박 재료: pork(D-1), tofu(D-1), pa(D-1) -> 3개
    // rcp4(pork, tofu) + rcp2(tofu, pa) -> 2개 요리로 pork, tofu, pa 전량(3개) 소진 가능!
    const view = {
      pork: { items: [{ qtyAmount: 1, expiry: 'D-1', imminent: true }] },
      tofu: { items: [{ qtyAmount: 1, expiry: 'D-1', imminent: true }] },
      pa:   { items: [{ qtyAmount: 1, expiry: 'D-1', imminent: true }] },
    };
    const result = generateImminentRescueSet(view, recipes, 3);
    expect(result.coveredIds.sort()).toEqual(['pa', 'pork', 'tofu']);
    expect(result.recipeIds.length).toBeLessThanOrEqual(2); // 3개 요리가 아니라 2개 이하 요리로 커버
  });

  test('알림 설정 일수(threshold)를 반영하여 임박 대상을 동적으로 선정한다', () => {
    // pork(D-2), tofu(D-4)
    const view = {
      pork: { items: [{ qtyAmount: 1, expiry: 'D-2', imminent: true }] },
      tofu: { items: [{ qtyAmount: 1, expiry: 'D-4', imminent: false }] },
    };
    // threshold = 3 일 때: pork만 임박 대상 -> rcp4(pork, tofu) 또는 rcp1 선택 (1요리)
    const res1 = generateImminentRescueSet(view, recipes, 3);
    expect(res1.coveredIds).toEqual(['pork']);

    // threshold = 5 일 때: pork, tofu 둘 다 임박 대상 -> rcp4(pork, tofu) 1개 요리로 둘 다 커버!
    const res2 = generateImminentRescueSet(view, recipes, 5);
    expect(res2.coveredIds.sort()).toEqual(['pork', 'tofu']);
  });

  test('K_max 내 전량 소진 불가 시 최대 커버 조합 및 미소진 재료(uncoveredIds)를 반환한다', () => {
    const view = {
      pork: { items: [{ qtyAmount: 1, expiry: 'D-1', imminent: true }] },
      tofu: { items: [{ qtyAmount: 1, expiry: 'D-1', imminent: true }] },
      egg:  { items: [{ qtyAmount: 1, expiry: 'D-1', imminent: true }] },
      spicy:{ items: [{ qtyAmount: 1, expiry: 'D-1', imminent: true }] },
    };
    const result = generateImminentRescueSet(view, recipes, 3, 1); // K_max = 1 (1개 요리만 선택)
    expect(result.coveredIds.length).toBeGreaterThan(0);
    expect(result.uncoveredIds).toContain('spicy');
  });
});
