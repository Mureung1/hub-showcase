// @ts-check
import { aggregateLedger } from './ledger.mjs';

// 합계잔액시산표 — 열 순서는 실무 표준 [차변잔액|차변합계|계정과목|대변합계|대변잔액].
// 잔액 방향: net = 차변합계 - 대변합계, 양수면 차변잔액 열에, 음수면 대변잔액 열에 절대값을 놓는다.
/** @param {import('./store.mjs').Entry[]} entries */
export function buildTrialBalance(entries) {
  const rows = aggregateLedger(entries).map(({ account, debitTotal, creditTotal }) => {
    const net = debitTotal - creditTotal;
    return {
      code: account.code,
      name: account.name,
      debitBalance: net > 0 ? net : 0,
      debitTotal,
      creditTotal,
      creditBalance: net < 0 ? -net : 0,
    };
  });

  const totals = rows.reduce(
    (t, r) => ({
      debitBalance: t.debitBalance + r.debitBalance,
      debitTotal: t.debitTotal + r.debitTotal,
      creditTotal: t.creditTotal + r.creditTotal,
      creditBalance: t.creditBalance + r.creditBalance,
    }),
    { debitBalance: 0, debitTotal: 0, creditTotal: 0, creditBalance: 0 },
  );

  return {
    rows,
    totals,
    // 대차평균의 원리: 합계끼리, 잔액끼리 모두 일치해야 전기(轉記) 오류가 없다
    balanced: totals.debitTotal === totals.creditTotal && totals.debitBalance === totals.creditBalance,
  };
}
