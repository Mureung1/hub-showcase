import { test, expect } from 'vitest';
import { calcExpiryDate } from './ingredients.js';

test('calcExpiryDate: 봄(3~5월)에 산 양파는 avgShelfLifeDays.spring만큼 뒤', () => {
  // 양파 avgShelfLifeDays.spring === 14
  expect(calcExpiryDate('onion', '2026-04-01')).toBe('2026-04-15');
});

test('calcExpiryDate: 계절에 따라 같은 재료도 다른 유통기한이 나온다', () => {
  // 양파 avgShelfLifeDays.winter === 30
  expect(calcExpiryDate('onion', '2026-01-01')).toBe('2026-01-31');
});

test('calcExpiryDate: 마스터에 없는 재료 id는 null', () => {
  expect(calcExpiryDate('존재하지않는재료', '2026-04-01')).toBe(null);
});
