// 통합 테스트 — 종이책 CSV → 엔진 → 정답지 대조 전 과정을 고정한다.
// 검증기가 "항상 초록"이 아니라 실제로 오류를 잡는지(음성 케이스)도 확인한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { parseFile, parseKeyValue, sum } from '../src/io/csv.js';
import { 검증 } from '../src/validate/integrity.js';
import { 시부인 } from '../src/engine/depreciation.js';
import { 계산 } from '../src/engine/tax.js';

const TPL = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'templates');
const num = (v) => Number(String(v ?? 0).replace(/,/g, '')) || 0;

function 재현(dir) {
  const 회사 = parseKeyValue(join(dir, 'company.csv'));
  const 손익계산서 = parseFile(join(dir, 'income_statement.csv'));
  const 재무상태표 = parseFile(join(dir, 'balance_sheet.csv'));
  const 자산대장 = parseFile(join(dir, 'assets.csv'));
  const 조정 = parseFile(join(dir, 'adjustments.csv'));

  const v = 검증({ 재무상태표, 손익계산서, 자산대장 });
  let 감가부인 = 0, 감가추인 = 0;
  for (const a of 자산대장) {
    const s = 시부인({
      명: a.명, 구분: a.구분, 취득일: a.취득일,
      취득가: num(a.취득가), 기초누계: num(a.기초누계), 회사계상액: num(a.회사계상액),
      방법: a.방법, 내용연수: num(a.내용연수), 전기이월부인액: num(a.전기이월부인액),
      업무용승용차: a.업무용승용차 === 'true',
    }, 회사);
    감가부인 += s.부인액; 감가추인 += s.추인액;
  }
  const r = 계산({
    당기순이익: v.당기순이익,
    가산조정: sum(조정.filter((x) => ['익금산입', '손금불산입'].includes(x.구분)), '금액') + 감가부인,
    차감조정: sum(조정.filter((x) => ['손금산입', '익금불산입'].includes(x.구분)), '금액') + 감가추인,
    이월결손금: num(회사.이월결손금), 기납부세액: num(회사.기납부세액),
    중소기업: 회사.중소기업 === true, 사업연도개시일: 회사.사업연도개시일,
  });
  return { v, r };
}

test('예시 템플릿이 정답지와 완전히 재현된다', () => {
  const { v, r } = 재현(TPL);
  const 정답 = parseKeyValue(join(TPL, 'answer.csv'));

  assert.equal(v.ok, true, '입력 무결성 통과');
  assert.equal(r.각사업연도소득, 정답.각사업연도소득);
  assert.equal(r.과세표준, 정답.과세표준);
  assert.equal(r.산출세액, 정답.산출세액);
  assert.equal(r.차감납부세액, 정답.차감납부세액);
  assert.equal(r.지방소득세.산출세액, 정답.지방소득세);
});

test('당기순이익은 하드코딩이 아니라 손익계산서에서 계산된다', () => {
  const { v } = 재현(TPL);
  assert.equal(v.당기순이익, 157_000_000 - 78_500_000); // 수익 − 비용
});

// ── 음성 케이스: 검증기가 실제로 오류를 잡는가 ──────
test('재무상태표 대차가 안 맞으면 검증기가 잡는다', () => {
  const 정상 = parseFile(join(TPL, 'balance_sheet.csv'));
  const 훼손 = 정상.map((r) => r.계정 === '보통예금' ? { ...r, 금액: '99999999' } : r);
  const v = 검증({ 재무상태표: 훼손 });
  assert.equal(v.ok, false);
  assert.ok(v.checks.some((c) => c.name.includes('대차평형') && !c.ok));
});

test('자산 기초누계가 취득가를 넘으면 검증기가 잡는다', () => {
  const v = 검증({ 자산대장: [{ 명: '이상자산', 취득일: '2020-01-01', 취득가: '1000000', 기초누계: '2000000' }] });
  assert.equal(v.ok, false);
});
