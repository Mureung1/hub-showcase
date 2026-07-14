// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { ACCOUNTS, getAccount } from '../src/accounts.mjs';

test('계정 코드에 중복이 없다', () => {
  const codes = ACCOUNTS.map((a) => a.code);
  assert.equal(new Set(codes).size, codes.length);
});

test('모든 계정이 유효한 분류 필드를 가진다', () => {
  const TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'];
  const BS_GROUPS = ['currentAsset', 'nonCurrentAsset', 'currentLiability', 'nonCurrentLiability', 'equity'];
  const IS_GROUPS = ['sales', 'cogs', 'sga', 'nonOpRevenue', 'nonOpExpense'];

  for (const a of ACCOUNTS) {
    assert.ok(TYPES.includes(a.type), `${a.code} type`);
    assert.ok(['debit', 'credit'].includes(a.normalSide), `${a.code} normalSide`);
    if (['asset', 'liability', 'equity'].includes(a.type)) {
      // 재무상태 계정: bsGroup만 있고 isGroup은 없다
      assert.ok(a.bsGroup !== null && BS_GROUPS.includes(a.bsGroup), `${a.code} bsGroup`);
      assert.equal(a.isGroup, null, `${a.code} isGroup은 null이어야 함`);
    } else {
      // 손익 계정: isGroup만 있고 bsGroup은 없다
      assert.ok(a.isGroup !== null && IS_GROUPS.includes(a.isGroup), `${a.code} isGroup`);
      assert.equal(a.bsGroup, null, `${a.code} bsGroup은 null이어야 함`);
    }
  }
});

test('자산·비용은 차변, 부채·자본·수익은 대변이 정상 잔액 방향이다', () => {
  for (const a of ACCOUNTS) {
    const expected = ['asset', 'expense'].includes(a.type) ? 'debit' : 'credit';
    assert.equal(a.normalSide, expected, `${a.code} ${a.name}`);
  }
});

test('getAccount는 등록 계정을 반환하고 미등록 코드에는 null을 반환한다', () => {
  assert.equal(getAccount('103')?.name, '보통예금');
  assert.equal(getAccount('999'), null);
});
