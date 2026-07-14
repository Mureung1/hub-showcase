// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIncomeStatement } from '../src/incomeStatement.mjs';
import { buildBalanceSheet } from '../src/balanceSheet.mjs';

const SAMPLE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'entries.sample.json');
const entries = JSON.parse(await readFile(SAMPLE, 'utf8'));
const is = buildIncomeStatement(entries);
const bs = buildBalanceSheet(entries);

test('손익계산서: 단계 소계가 수기 계산값과 일치한다', () => {
  assert.equal(is.sales, 140_000_000);
  assert.equal(is.cogs, 0);
  assert.equal(is.grossProfit, 140_000_000);
  assert.equal(is.sga, 49_400_000);
  assert.equal(is.operatingIncome, 90_600_000);
  assert.equal(is.nonOpRevenue, 150_000);
  assert.equal(is.nonOpExpense, 250_000);
  assert.equal(is.netIncome, 90_500_000);
});

test('손익계산서: netIncome = Σ수익 - Σ비용', () => {
  assert.equal(is.netIncome, is.sales + is.nonOpRevenue - is.cogs - is.sga - is.nonOpExpense);
});

test('손익계산서: 부가세 계정(135, 255)은 손익에 나타나지 않는다', () => {
  const codes = Object.values(is.groups).flat().map((a) => a.code);
  assert.ok(!codes.includes('135'));
  assert.ok(!codes.includes('255'));
});

test('재무상태표: 자산 = 부채 + 자본 (당기순이익 반영 후)', () => {
  assert.ok(bs.balanced);
  assert.equal(bs.totalAssets, bs.totalLiabilities + bs.totalEquity);
});

test('재무상태표: 총계가 수기 계산값과 일치한다', () => {
  assert.equal(bs.totalAssets, 155_000_000);
  assert.equal(bs.totalLiabilities, 14_500_000);
  assert.equal(bs.totalEquity, 140_500_000);
});

test('재무상태표: 자본 섹션의 당기순이익이 손익계산서와 일치한다', () => {
  const ni = bs.groups.equity.find((a) => a.name === '당기순이익');
  assert.equal(ni?.amount, is.netIncome);
});

test('재무상태표: 잔액 0인 계정(미지급금 등 정산 완료분)은 표시하지 않는다', () => {
  const codes = Object.values(bs.groups).flat().map((a) => a.code);
  assert.ok(!codes.includes('253'), '미지급금은 결제 완료라 미표시');
  assert.ok(!codes.includes('108'), '외상매출금은 회수 완료라 미표시');
});
