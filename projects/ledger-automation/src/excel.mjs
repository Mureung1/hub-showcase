// @ts-check
// Excel 렌더러 — 시트 3장(합계잔액시산표/재무상태표/손익계산서)을 만든다.
// exceljs는 CJS 패키지라 default import. 열 너비(ws.columns)는 반드시 데이터 삽입 전에 설정한다.
import ExcelJS from 'exceljs';
import { buildTrialBalance } from './trialBalance.mjs';
import { IS_GROUP_LABELS, buildIncomeStatement } from './incomeStatement.mjs';
import { BS_GROUP_LABELS, buildBalanceSheet } from './balanceSheet.mjs';

/** @typedef {import('./store.mjs').Entry[]} Entries */

// 원 단위 정수 서식 — 셀 값은 반드시 Number로 넣는다(문자열을 넣으면 텍스트 셀이 되어 서식이 무시됨)
const WON = '#,##0';

/** @param {import('exceljs').Row} row */
function emphasize(row) {
  row.font = { bold: true };
  return row;
}

/**
 * @param {import('exceljs').Workbook} wb
 * @param {Entries} entries
 */
function addTrialBalanceSheet(wb, entries) {
  const tb = buildTrialBalance(entries);
  const ws = wb.addWorksheet('합계잔액시산표');
  ws.columns = [{ width: 16 }, { width: 16 }, { width: 22 }, { width: 16 }, { width: 16 }];

  // 2단 헤더: [차변(잔액|합계) | 계정과목 | 대변(합계|잔액)] — 실무 표준 열 순서
  ws.addRow(['차변', '', '계정과목', '대변', '']);
  ws.addRow(['잔액', '합계', '', '합계', '잔액']);
  ws.mergeCells('A1:B1');
  ws.mergeCells('C1:C2');
  ws.mergeCells('D1:E1');
  for (const n of [1, 2]) {
    const row = ws.getRow(n);
    row.font = { bold: true };
    row.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  for (const r of tb.rows) {
    ws.addRow([r.debitBalance, r.debitTotal, r.name, r.creditTotal, r.creditBalance]);
  }
  emphasize(ws.addRow([tb.totals.debitBalance, tb.totals.debitTotal, '합계', tb.totals.creditTotal, tb.totals.creditBalance]));

  for (const col of ['A', 'B', 'D', 'E']) ws.getColumn(col).numFmt = WON;
}

/**
 * @param {import('exceljs').Workbook} wb
 * @param {Entries} entries
 */
function addBalanceSheetSheet(wb, entries) {
  const bs = buildBalanceSheet(entries);
  const ws = wb.addWorksheet('재무상태표');
  ws.columns = [{ width: 28 }, { width: 18 }];

  const header = ws.addRow(['과목', '금액']);
  header.font = { bold: true };
  header.alignment = { horizontal: 'center' };

  /** @param {import('./accounts.mjs').BsGroup} g */
  const addGroup = (g) => {
    const lines = bs.groups[g];
    if (lines.length === 0) return; // 라인이 없는 그룹(비유동부채 등)은 표시하지 않는다
    emphasize(ws.addRow([BS_GROUP_LABELS[g], bs.subtotals[g]]));
    for (const line of lines) ws.addRow([`  ${line.name}`, line.amount]);
  };

  addGroup('currentAsset');
  addGroup('nonCurrentAsset');
  emphasize(ws.addRow(['자산총계', bs.totalAssets]));
  addGroup('currentLiability');
  addGroup('nonCurrentLiability');
  emphasize(ws.addRow(['부채총계', bs.totalLiabilities]));
  addGroup('equity');
  emphasize(ws.addRow(['자본총계', bs.totalEquity]));
  emphasize(ws.addRow(['부채와자본총계', bs.totalLiabilities + bs.totalEquity]));

  ws.getColumn('B').numFmt = WON;
}

/**
 * @param {import('exceljs').Workbook} wb
 * @param {Entries} entries
 */
function addIncomeStatementSheet(wb, entries) {
  const is = buildIncomeStatement(entries);
  const ws = wb.addWorksheet('손익계산서');
  ws.columns = [{ width: 28 }, { width: 18 }];

  const header = ws.addRow(['과목', '금액']);
  header.font = { bold: true };
  header.alignment = { horizontal: 'center' };

  /**
   * @param {import('./accounts.mjs').IsGroup} g
   * @param {number} subtotal
   */
  const addGroup = (g, subtotal) => {
    emphasize(ws.addRow([IS_GROUP_LABELS[g], subtotal]));
    for (const line of is.groups[g]) ws.addRow([`  ${line.name}`, line.amount]);
  };

  addGroup('sales', is.sales);
  addGroup('cogs', is.cogs);
  emphasize(ws.addRow(['매출총이익', is.grossProfit]));
  addGroup('sga', is.sga);
  emphasize(ws.addRow(['영업이익', is.operatingIncome]));
  addGroup('nonOpRevenue', is.nonOpRevenue);
  addGroup('nonOpExpense', is.nonOpExpense);
  emphasize(ws.addRow(['법인세비용차감전순이익', is.incomeBeforeTax]));
  emphasize(ws.addRow(['당기순이익', is.netIncome]));

  ws.getColumn('B').numFmt = WON;

  ws.addRow([]);
  ws.addRow(['* 법인세비용은 이번 범위에서 계상하지 않음 (당기순이익 = 법인세비용차감전순이익)']);
}

/**
 * @param {Entries} entries
 * @returns {import('exceljs').Workbook}
 */
export function buildReportWorkbook(entries) {
  const wb = new ExcelJS.Workbook();
  addTrialBalanceSheet(wb, entries);
  addBalanceSheetSheet(wb, entries);
  addIncomeStatementSheet(wb, entries);
  return wb;
}

// 스트리밍 대신 writeBuffer — 생성이 다 끝난 뒤에 HTTP 헤더를 보낼 수 있어 에러 처리가 깔끔하다.
/**
 * @param {Entries} entries
 * @returns {Promise<Buffer>}
 */
export async function buildReportBuffer(entries) {
  const buf = await buildReportWorkbook(entries).xlsx.writeBuffer();
  return Buffer.from(/** @type {ArrayBuffer} */ (buf));
}
