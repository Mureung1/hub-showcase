// @ts-check
import { aggregateLedger } from './ledger.mjs';

/**
 * @typedef {import('./accounts.mjs').IsGroup} IsGroup
 * @typedef {{ code: string, name: string, amount: number }} IsLine
 */

/** @type {Record<IsGroup, string>} */
export const IS_GROUP_LABELS = {
  sales: '매출액',
  cogs: '매출원가',
  sga: '판매비와관리비',
  nonOpRevenue: '영업외수익',
  nonOpExpense: '영업외비용',
};

// 손익계산서 — 단계 소계: 매출총이익 → 영업이익 → 법인세비용차감전순이익 → 당기순이익.
// 손익 계정 잔액: 수익은 (대변-차변), 비용은 (차변-대변).
/** @param {import('./store.mjs').Entry[]} entries */
export function buildIncomeStatement(entries) {
  /** @type {Record<IsGroup, IsLine[]>} */
  const groups = { sales: [], cogs: [], sga: [], nonOpRevenue: [], nonOpExpense: [] };

  for (const { account, debitTotal, creditTotal } of aggregateLedger(entries)) {
    if (!account.isGroup) continue;
    const amount = account.type === 'revenue' ? creditTotal - debitTotal : debitTotal - creditTotal;
    groups[account.isGroup].push({ code: account.code, name: account.name, amount });
  }

  /** @param {IsGroup} g */
  const sum = (g) => groups[g].reduce((s, a) => s + a.amount, 0);
  const sales = sum('sales');
  const cogs = sum('cogs');
  const sga = sum('sga');
  const nonOpRevenue = sum('nonOpRevenue');
  const nonOpExpense = sum('nonOpExpense');

  const grossProfit = sales - cogs;
  const operatingIncome = grossProfit - sga;
  const incomeBeforeTax = operatingIncome + nonOpRevenue - nonOpExpense;
  // 이번 슬라이스에서는 법인세비용을 계상하지 않는다 → 당기순이익 = 법인세비용차감전순이익
  const netIncome = incomeBeforeTax;

  return { groups, sales, cogs, grossProfit, sga, operatingIncome, nonOpRevenue, nonOpExpense, incomeBeforeTax, netIncome };
}
