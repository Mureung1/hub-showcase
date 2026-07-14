// @ts-check
import { getAccount } from './accounts.mjs';

/**
 * @typedef {import('./accounts.mjs').Account} Account
 * @typedef {{ account: Account, debitTotal: number, creditTotal: number }} LedgerRow
 */

// 전표 배열 → 계정별 차변합계/대변합계 집계 (총계정원장 요약).
// 반환: [{ account, debitTotal, creditTotal }] — 계정 코드 오름차순 (코드 순서 ≈ 재무제표 표시 순서)
/**
 * @param {import('./store.mjs').Entry[]} entries
 * @returns {LedgerRow[]}
 */
export function aggregateLedger(entries) {
  /** @type {Map<string, LedgerRow>} */
  const map = new Map();
  for (const entry of entries) {
    for (const line of entry.lines) {
      let agg = map.get(line.accountCode);
      if (!agg) {
        const account = getAccount(line.accountCode);
        if (!account) throw new Error(`등록되지 않은 계정코드입니다: ${line.accountCode}`);
        agg = { account, debitTotal: 0, creditTotal: 0 };
        map.set(line.accountCode, agg);
      }
      agg.debitTotal += line.debit;
      agg.creditTotal += line.credit;
    }
  }
  return [...map.values()].sort((a, b) => a.account.code.localeCompare(b.account.code));
}
