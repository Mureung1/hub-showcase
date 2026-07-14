// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTrialBalance } from '../src/trialBalance.mjs';

const SAMPLE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'entries.sample.json');
const entries = JSON.parse(await readFile(SAMPLE, 'utf8'));
const tb = buildTrialBalance(entries);

test('합계잔액시산표: 차변합계 총계 = 대변합계 총계', () => {
  assert.equal(tb.totals.debitTotal, tb.totals.creditTotal);
});

test('합계잔액시산표: 차변잔액 총계 = 대변잔액 총계', () => {
  assert.equal(tb.totals.debitBalance, tb.totals.creditBalance);
  assert.ok(tb.balanced);
});

test('합계잔액시산표: 각 행은 차변잔액·대변잔액 중 한쪽만 갖는다', () => {
  for (const r of tb.rows) {
    assert.ok(r.debitBalance === 0 || r.creditBalance === 0, `${r.code} ${r.name}`);
  }
});

test('합계잔액시산표: 보통예금(103) 잔액은 수기 계산값 142,000,000원과 일치한다', () => {
  const bank = tb.rows.find((r) => r.code === '103');
  assert.equal(bank?.debitBalance, 142_000_000);
});

test('합계잔액시산표: 부가세대급금(135)은 정산 완료로 잔액 0, 부가세예수금(255)은 2기 확정분 3,600,000원이 남는다', () => {
  const vatIn = tb.rows.find((r) => r.code === '135');
  assert.equal(vatIn?.debitBalance, 0);
  assert.equal(vatIn?.creditBalance, 0);
  const vatOut = tb.rows.find((r) => r.code === '255');
  assert.equal(vatOut?.creditBalance, 3_600_000);
});
