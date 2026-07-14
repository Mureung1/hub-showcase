// @ts-check
import { aggregateLedger } from './ledger.mjs';
import { buildIncomeStatement } from './incomeStatement.mjs';

/**
 * @typedef {import('./accounts.mjs').BsGroup} BsGroup
 * @typedef {{ code: string | null, name: string, amount: number }} BsLine 당기순이익 라인은 계정코드가 없어 code가 null이다
 */

/** @type {Record<BsGroup, string>} */
export const BS_GROUP_LABELS = {
  currentAsset: '유동자산',
  nonCurrentAsset: '비유동자산',
  currentLiability: '유동부채',
  nonCurrentLiability: '비유동부채',
  equity: '자본',
};

// 재무상태표 — 마감분개 없이 당기순이익을 자본 섹션에 계산상 반영한다 (단일 회계기간이므로 집합손익 대체 생략).
// 검증 항등식: 총자산 = 총부채 + 자본(원장 잔액) + 당기순이익 — 시산표의 대차평균 원리와 수학적으로 동치.
/** @param {import('./store.mjs').Entry[]} entries */
export function buildBalanceSheet(entries) {
  /** @type {Record<BsGroup, BsLine[]>} */
  const groups = { currentAsset: [], nonCurrentAsset: [], currentLiability: [], nonCurrentLiability: [], equity: [] };

  for (const { account, debitTotal, creditTotal } of aggregateLedger(entries)) {
    if (!account.bsGroup) continue;
    const amount = account.normalSide === 'debit' ? debitTotal - creditTotal : creditTotal - debitTotal;
    if (amount === 0) continue; // 잔액 0인 계정은 표시하지 않는다
    groups[account.bsGroup].push({ code: account.code, name: account.name, amount });
  }

  const { netIncome } = buildIncomeStatement(entries);
  groups.equity.push({ code: null, name: '당기순이익', amount: netIncome });

  /** @param {BsGroup} g */
  const sum = (g) => groups[g].reduce((s, a) => s + a.amount, 0);
  const groupKeys = /** @type {BsGroup[]} */ (Object.keys(groups));
  const subtotals = /** @type {Record<BsGroup, number>} */ (Object.fromEntries(groupKeys.map((g) => [g, sum(g)])));
  const totalAssets = subtotals.currentAsset + subtotals.nonCurrentAsset;
  const totalLiabilities = subtotals.currentLiability + subtotals.nonCurrentLiability;
  const totalEquity = subtotals.equity;

  return {
    groups,
    subtotals,
    totalAssets,
    totalLiabilities,
    totalEquity,
    netIncome,
    balanced: totalAssets === totalLiabilities + totalEquity,
  };
}
