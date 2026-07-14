// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { buildReportBuffer } from '../src/excel.mjs';
import { buildTrialBalance } from '../src/trialBalance.mjs';
import { buildIncomeStatement } from '../src/incomeStatement.mjs';
import { buildBalanceSheet } from '../src/balanceSheet.mjs';

const SAMPLE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'entries.sample.json');
const entries = JSON.parse(await readFile(SAMPLE, 'utf8'));

const tb = buildTrialBalance(entries);
const is = buildIncomeStatement(entries);
const bs = buildBalanceSheet(entries);

// exceljs의 load() 타입 선언이 자체 Buffer(ArrayBuffer 계열)만 받게 되어 있으나 런타임은 Node Buffer도 지원 — 캐스트로 우회한다.
/** @param {Buffer} buf */
const asExcelBuffer = (buf) => /** @type {import('exceljs').Buffer} */ (/** @type {unknown} */ (buf));

// 라운드트립: 우리가 만든 버퍼를 exceljs로 다시 파싱해 "실제 파일에 적힌 값"을 검증한다.
// (렌더 코드가 셀을 잘못 놓거나 문자열로 넣으면 여기서 계산 결과와 어긋나 잡힌다.)
const wb = new ExcelJS.Workbook();
await wb.xlsx.load(asExcelBuffer(await buildReportBuffer(entries)));

/**
 * 라벨 열에서 label과 정확히 일치하는 행을 찾아 값 열의 셀 값을 돌려준다.
 * @param {import('exceljs').Worksheet} ws
 * @param {string} label
 * @param {number} [labelCol] 열 번호 (1부터 셈)
 * @param {number} [valueCol]
 * @returns {unknown}
 */
function valueByLabel(ws, label, labelCol = 1, valueCol = 2) {
  let value;
  ws.eachRow((row) => {
    if (row.getCell(labelCol).value === label) value = row.getCell(valueCol).value;
  });
  return value;
}

test('워크북에 시트 3장이 순서대로 들어 있다', () => {
  assert.deepEqual(wb.worksheets.map((w) => w.name), ['합계잔액시산표', '재무상태표', '손익계산서']);
});

test('시산표 시트: 합계 행의 네 총계가 계산 결과와 일치한다', () => {
  const ws = /** @type {import('exceljs').Worksheet} */ (wb.getWorksheet('합계잔액시산표'));
  assert.equal(valueByLabel(ws, '합계', 3, 1), tb.totals.debitBalance);
  assert.equal(valueByLabel(ws, '합계', 3, 2), tb.totals.debitTotal);
  assert.equal(valueByLabel(ws, '합계', 3, 4), tb.totals.creditTotal);
  assert.equal(valueByLabel(ws, '합계', 3, 5), tb.totals.creditBalance);
});

test('시산표 시트: 행 수 = 헤더 2 + 계정 수 + 합계 1', () => {
  const ws = /** @type {import('exceljs').Worksheet} */ (wb.getWorksheet('합계잔액시산표'));
  assert.equal(ws.rowCount, 2 + tb.rows.length + 1);
});

test('재무상태표 시트: 총계 셀이 계산 결과와 일치한다', () => {
  const ws = /** @type {import('exceljs').Worksheet} */ (wb.getWorksheet('재무상태표'));
  assert.equal(valueByLabel(ws, '자산총계'), bs.totalAssets);
  assert.equal(valueByLabel(ws, '부채총계'), bs.totalLiabilities);
  assert.equal(valueByLabel(ws, '자본총계'), bs.totalEquity);
  assert.equal(valueByLabel(ws, '부채와자본총계'), bs.totalLiabilities + bs.totalEquity);
});

test('손익계산서 시트: 단계 소계가 계산 결과와 일치한다', () => {
  const ws = /** @type {import('exceljs').Worksheet} */ (wb.getWorksheet('손익계산서'));
  assert.equal(valueByLabel(ws, '매출액'), is.sales);
  assert.equal(valueByLabel(ws, '매출총이익'), is.grossProfit);
  assert.equal(valueByLabel(ws, '영업이익'), is.operatingIncome);
  assert.equal(valueByLabel(ws, '법인세비용차감전순이익'), is.incomeBeforeTax);
  assert.equal(valueByLabel(ws, '당기순이익'), is.netIncome);
});

test('전표가 하나도 없어도 워크북 생성이 실패하지 않는다', async () => {
  const empty = new ExcelJS.Workbook();
  await empty.xlsx.load(asExcelBuffer(await buildReportBuffer([])));
  const ws = /** @type {import('exceljs').Worksheet} */ (empty.getWorksheet('재무상태표'));
  assert.equal(valueByLabel(ws, '자산총계'), 0);
});
