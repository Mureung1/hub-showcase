// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEntry } from '../src/validate.mjs';
import { aggregateLedger } from '../src/ledger.mjs';

const SAMPLE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'entries.sample.json');
const entries = JSON.parse(await readFile(SAMPLE, 'utf8'));

test('샘플 전표는 전건 검증을 통과한다', () => {
  for (const e of entries) {
    assert.deepEqual(validateEntry(e), [], `${e.id} ${e.description}`);
  }
});

test('원장 집계: 총차변 = 총대변 (대차평균의 원리)', () => {
  const ledger = aggregateLedger(entries);
  const debit = ledger.reduce((s, a) => s + a.debitTotal, 0);
  const credit = ledger.reduce((s, a) => s + a.creditTotal, 0);
  assert.equal(debit, credit);
});

test('원장 집계: 계정별 순액(차변-대변)의 총합은 0이다', () => {
  const ledger = aggregateLedger(entries);
  const netSum = ledger.reduce((s, a) => s + (a.debitTotal - a.creditTotal), 0);
  assert.equal(netSum, 0);
});

test('원장 집계는 계정 코드 오름차순으로 정렬된다', () => {
  const codes = aggregateLedger(entries).map((a) => a.account.code);
  assert.deepEqual(codes, [...codes].sort());
});

test('미등록 계정코드가 섞이면 집계가 실패한다', () => {
  assert.throws(
    () => aggregateLedger([{ id: 'x', date: '2025-01-01', description: 'bad', lines: [{ accountCode: '999', debit: 1, credit: 0 }] }]),
    /등록되지 않은 계정코드/,
  );
});
