// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEntry } from '../src/validate.mjs';

/** @param {Record<string, unknown>} [overrides] */
function entry(overrides = {}) {
  // 유효한 기본 전표: 차)보통예금 110,000 / 대)용역매출 100,000 + 부가세예수금 10,000
  return {
    date: '2025-01-31',
    description: '1월 용역매출',
    lines: [
      { accountCode: '103', debit: 110000, credit: 0 },
      { accountCode: '401', debit: 0, credit: 100000 },
      { accountCode: '255', debit: 0, credit: 10000 },
    ],
    ...overrides,
  };
}

test('유효한 전표는 오류가 없다', () => {
  assert.deepEqual(validateEntry(entry()), []);
});

test('차변 합계와 대변 합계가 다르면 거부한다', () => {
  const e = entry({
    lines: [
      { accountCode: '103', debit: 110000, credit: 0 },
      { accountCode: '401', debit: 0, credit: 100000 },
    ],
  });
  assert.ok(validateEntry(e).some((m) => m.includes('일치하지')));
});

test('한 라인에 차변·대변 모두 양수이면 거부한다', () => {
  const e = entry({
    lines: [
      { accountCode: '103', debit: 100000, credit: 50000 },
      { accountCode: '401', debit: 50000, credit: 100000 },
    ],
  });
  assert.ok(validateEntry(e).some((m) => m.includes('한쪽에만')));
});

test('차변·대변 모두 0인 라인은 거부한다', () => {
  const e = entry({
    lines: [
      { accountCode: '103', debit: 100000, credit: 0 },
      { accountCode: '108', debit: 0, credit: 0 },
      { accountCode: '401', debit: 0, credit: 100000 },
    ],
  });
  assert.ok(validateEntry(e).some((m) => m.includes('금액이 있어야')));
});

test('등록되지 않은 계정코드는 거부한다', () => {
  const e = entry({
    lines: [
      { accountCode: '999', debit: 100000, credit: 0 },
      { accountCode: '401', debit: 0, credit: 100000 },
    ],
  });
  assert.ok(validateEntry(e).some((m) => m.includes('등록되지 않은')));
});

test('정수가 아니거나 음수인 금액은 거부한다', () => {
  for (const bad of [0.5, -100, '100000', NaN, Infinity, null, undefined]) {
    const e = entry({
      lines: [
        { accountCode: '103', debit: bad, credit: 0 },
        { accountCode: '401', debit: 0, credit: 100000 },
      ],
    });
    assert.ok(
      validateEntry(e).some((m) => m.includes('원 단위 정수')),
      `거부되어야 함: ${String(bad)}`,
    );
  }
});

test('라인이 2개 미만이면 거부한다', () => {
  const e = entry({ lines: [{ accountCode: '103', debit: 0, credit: 0 }] });
  assert.ok(validateEntry(e).some((m) => m.includes('2개 이상')));
});

test('날짜 형식·적요 누락을 거부한다', () => {
  assert.ok(validateEntry(entry({ date: '2025/01/31' })).some((m) => m.includes('YYYY-MM-DD')));
  assert.ok(validateEntry(entry({ date: '2025-13-99' })).some((m) => m.includes('YYYY-MM-DD')));
  assert.ok(validateEntry(entry({ description: '  ' })).some((m) => m.includes('적요')));
});

test('전표 자체가 객체가 아니면 거부한다', () => {
  assert.equal(validateEntry(null).length, 1);
  assert.equal(validateEntry([]).length, 1);
});
