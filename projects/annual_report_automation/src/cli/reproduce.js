// 재현 CLI — 종이책 CSV를 읽어 세무조정을 재현하고 정답지와 대조한다.
//
//   node src/cli/reproduce.js [--dir <폴더>]
//   기본 폴더: data/templates (형식 예시). 실제 사용: data/private/fy2025 로 --dir 지정.
//
// 흐름: 입력 로드 → 무결성 검증 → 감가상각 시부인 → 조정 집계 → 별지3 계산 → 정답지 대조

import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { parseFile, parseKeyValue, sum } from '../io/csv.js';
import { 검증 } from '../validate/integrity.js';
import { 시부인 } from '../engine/depreciation.js';
import { 계산 } from '../engine/tax.js';

const won = (n) => (n == null ? '—' : Math.round(n).toLocaleString('ko-KR'));

function 로드(dir) {
  const opt = (name) => existsSync(join(dir, name)) ? name : null;
  return {
    회사: parseKeyValue(join(dir, 'company.csv')),
    손익계산서: parseFile(join(dir, 'income_statement.csv')),
    재무상태표: opt('balance_sheet.csv') ? parseFile(join(dir, 'balance_sheet.csv')) : null,
    자산대장: parseFile(join(dir, 'assets.csv')),
    조정: parseFile(join(dir, 'adjustments.csv')),
    정답: opt('answer.csv') ? parseKeyValue(join(dir, 'answer.csv')) : null,
  };
}

function run(dir) {
  const { 회사, 손익계산서, 재무상태표, 자산대장, 조정, 정답 } = 로드(dir);
  console.log(`\n  재현 대상: ${dir}`);
  console.log(`  법인: 사업연도 ${회사.사업연도개시일} ~ ${회사.사업연도종료일} · ${회사.중소기업 ? '중소기업' : '일반법인'}\n`);

  // ── 1. 무결성 검증 ──────────────────────────────
  const v = 검증({ 재무상태표, 손익계산서, 자산대장 });
  console.log('  [1] 입력 무결성 검증');
  for (const c of v.checks) console.log(`      ${c.ok ? '✓' : '✗'} ${c.name} — ${c.detail}`);
  if (!v.ok) { console.log('\n  ⚠️ 입력 오류가 있습니다. 종이 원본과 대조해 수정 후 다시 실행하세요.\n'); process.exitCode = 1; return; }

  const 당기순이익 = v.당기순이익;

  // ── 2. 감가상각 시부인 (자산별) ──────────────────
  console.log('\n  [2] 감가상각 시부인');
  const 자산정규화 = 자산대장.map((a) => ({
    명: a.명, 구분: a.구분, 취득일: a.취득일,
    취득가: num(a.취득가), 기초누계: num(a.기초누계), 회사계상액: num(a.회사계상액),
    방법: a.방법, 내용연수: num(a.내용연수), 전기이월부인액: num(a.전기이월부인액),
    업무용승용차: a.업무용승용차 === 'true' || a.업무용승용차 === true,
  }));
  let 감가부인 = 0, 감가추인 = 0;
  for (const a of 자산정규화) {
    const s = 시부인(a, 회사);
    감가부인 += s.부인액; 감가추인 += s.추인액;
    const flag = s.부인액 ? `부인 +${won(s.부인액)}` : s.추인액 ? `추인 −${won(s.추인액)}` : '일치';
    console.log(`      · ${s.자산.padEnd(6)} ${s.방법}${s.내용연수}년  계상 ${won(s.회사계상액)} / 범위 ${won(s.상각범위액)}  → ${flag}`);
  }

  // ── 3. 조정 집계 (소득금액조정합계표) ────────────
  const 가산조정 = sum(조정.filter((r) => ['익금산입', '손금불산입'].includes(r.구분)), '금액') + 감가부인;
  const 차감조정 = sum(조정.filter((r) => ['손금산입', '익금불산입'].includes(r.구분)), '금액') + 감가추인;
  console.log('\n  [3] 소득금액조정합계표');
  console.log(`      가산(익금산입·손금불산입): ${won(가산조정)}  (명세서 ${won(가산조정 - 감가부인)} + 감가부인 ${won(감가부인)})`);
  console.log(`      차감(손금산입·익금불산입): ${won(차감조정)}`);

  // ── 4. 별지3 세액 계산 ──────────────────────────
  const r = 계산({
    당기순이익, 가산조정, 차감조정,
    기부금한도초과: num(회사.기부금한도초과), 이월결손금: num(회사.이월결손금),
    공제감면세액: num(회사.공제감면세액), 가산세: num(회사.가산세), 기납부세액: num(회사.기납부세액),
    중소기업: 회사.중소기업 === true, 사업연도개시일: 회사.사업연도개시일,
  });
  console.log('\n  [4] 별지3 세액조정계산서');
  for (const s of r.단계) {
    const v = s.금액 == null ? (s.주석 ?? '') : won(s.금액);
    console.log(`      ${s.부호 || ' '} ${s.라벨.padEnd(24)} ${String(v).padStart(14)}${s.최종 ? '  ★' : ''}`);
  }
  console.log(`      + 법인지방소득세 (위택스 별도)      ${won(r.지방소득세.산출세액).padStart(14)}`);
  console.log(`      = 총 납부세액                       ${won(r.총납부세액).padStart(14)}`);

  // ── 5. 정답지 대조 ──────────────────────────────
  if (정답) {
    console.log('\n  [5] 종이책 정답지 대조');
    const rows = [
      ['각사업연도소득', r.각사업연도소득, 정답.각사업연도소득],
      ['과세표준', r.과세표준, 정답.과세표준],
      ['산출세액', r.산출세액, 정답.산출세액],
      ['차감납부세액', r.차감납부세액, 정답.차감납부세액],
      ['지방소득세', r.지방소득세.산출세액, 정답.지방소득세],
    ].filter(([, , 실제]) => 실제 != null);
    let 일치 = 0;
    for (const [name, 엔진, 실제] of rows) {
      const ok = Number(엔진) === Number(실제);
      if (ok) 일치++;
      const diff = ok ? '' : `  차이 ${won(Number(엔진) - Number(실제))}`;
      console.log(`      ${ok ? '✓' : '✗'} ${name.padEnd(14)} 엔진 ${won(엔진).padStart(14)} / 실제 ${won(실제).padStart(14)}${diff}`);
    }
    const 성공 = 일치 === rows.length;
    console.log(`\n  ${성공 ? '✅ 재현 성공' : `⚠️ ${rows.length - 일치}개 불일치`} — ${일치}/${rows.length} 항목 일치`);
    if (!성공) {
      console.log('     불일치는 셋 중 하나입니다: ⓐ 입력 오타 ⓑ 엔진 로직 오류 ⓒ 세무사 판단 개입(재현 불가가 정상)');
      process.exitCode = 1;
    }
  } else {
    console.log('\n  (answer.csv 없음 — 정답지 대조 생략)');
  }
  console.log('');
}

function num(v) { return Number(String(v ?? 0).replace(/,/g, '')) || 0; }

// ── entry ──
const argv = process.argv.slice(2);
const dirIdx = argv.indexOf('--dir');
const dir = dirIdx >= 0 ? argv[dirIdx + 1] : 'data/templates';
run(dir);
