import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAmt, formatAmtText, extractUnit, ingHave, getMissingInfo } from './fridgeLogic.js';

test('parseAmt: "300g"은 그램 단위 연속량으로 파싱', () => {
  assert.deepEqual(parseAmt('300g'), { val: 300, isGram: true });
});

test('parseAmt: 0.2g처럼 값이 작아도 0으로 뭉개지지 않는다', () => {
  // 9일차 발견 버그(소금 0.2g)의 회귀 방지 — parseInt(...) || fallback 패턴이 아니어야 함
  assert.deepEqual(parseAmt('0.2g'), { val: 0.2, isGram: true });
});

test('parseAmt: 분수 표현("1/2개")은 소수로 변환', () => {
  assert.deepEqual(parseAmt('1/2개'), { val: 0.5, isGram: false });
});

test('parseAmt: 빈 값은 기본 1개 취급', () => {
  assert.deepEqual(parseAmt(''), { val: 1, isGram: false });
});

test('extractUnit: 숫자·분수·공백을 제거하고 단위만 남긴다', () => {
  assert.equal(extractUnit('8쪽'), '쪽');
  assert.equal(extractUnit('1/2단'), '단');
});

test('extractUnit: 원문이 없으면 "단위"로 폴백', () => {
  assert.equal(extractUnit(null), '단위');
});

test('formatAmtText: 그램 단위는 formatGramQty 규칙을 따른다', () => {
  assert.equal(formatAmtText(0.2, true, '0.2g'), '0.2g');
  assert.equal(formatAmtText(300, true, '300g'), '300g');
});

test('formatAmtText: "약간" 같은 모호한 표현은 원문 그대로', () => {
  assert.equal(formatAmtText(2, false, '약간'), '약간');
});

test('formatAmtText: 개수 단위는 소수를 계량 가능한 분수로 스냅', () => {
  assert.equal(formatAmtText(2, false, '1개'), '2개');
});

test('ingHave: 재고에 있는 재료면 true', () => {
  const fridge = { tofu: { items: [{ qtyAmount: 1 }] } };
  assert.equal(ingHave(fridge, { id: 'tofu' }), true);
});

test('ingHave: 재고에 없으면 false', () => {
  const fridge = {};
  assert.equal(ingHave(fridge, { id: 'tofu' }), false);
});

test('ingHave: untracked 재료(조미료 등)는 항상 있는 것으로 취급', () => {
  assert.equal(ingHave({}, { untracked: true }), true);
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

  assert.equal(missing.size, 1);
  assert.deepEqual(missing.get('onion'), { qty: 1, isGram: false, label: '양파', originalAmt: '1개' });
});
