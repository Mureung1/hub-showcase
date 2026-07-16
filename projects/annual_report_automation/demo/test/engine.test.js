// 엔진 검증 — node --test
//
// ⚠️ mock 데이터의 세액이 "맞다"는 것을 증명하지 않는다 (정답지가 없으므로).
//    여기서 검증하는 것은 두 가지뿐:
//    ① 세법이 정한 외부 정답이 있는 계산 (상각률표 예제 — mock이 아님)
//    ② 내부 정합성 (대차평형, 수렴, 법적 제약 강제)

import test from 'node:test';
import assert from 'node:assert/strict';

import { runPipeline } from '../src/engine/pipeline.js';
import { runScenarios, 분개영향, 결정변수 } from '../src/engine/scenarios.js';
import { 상각범위액, 상각률표 } from '../src/engine/depreciation.js';
import { 법인세율구간 } from '../src/engine/stage4-tax.js';

const 회사2025 = { 사업연도개시일: '2025-01-01', 사업연도종료일: '2025-12-31' };

// ── ① 세법이 정한 외부 정답 (research.md §5 예제) ──────────
test('감가상각: 기계장치 1억 · 5년 정률법 1년차 = 45,100,000 (별표4 상각률 0.451)', () => {
  const 자산 = { 취득일: '2020-01-01', 취득가: 100_000_000, 기초누계: 0 };
  const r = 상각범위액(자산, { 방법: '정률', 내용연수: 5 }, 회사2025);
  assert.equal(r.금액, 45_100_000);
});

test('감가상각: 기계장치 1억 · 5년 정액법 = 20,000,000 (상각률 0.200)', () => {
  const 자산 = { 취득일: '2020-01-01', 취득가: 100_000_000, 기초누계: 0 };
  const r = 상각범위액(자산, { 방법: '정액', 내용연수: 5 }, 회사2025);
  assert.equal(r.금액, 20_000_000);
});

test('감가상각: 정률법 2년차는 미상각잔액 기준 = 54,900,000 × 0.451', () => {
  const 자산 = { 취득일: '2020-01-01', 취득가: 100_000_000, 기초누계: 45_100_000 };
  const r = 상각범위액(자산, { 방법: '정률', 내용연수: 5 }, 회사2025);
  assert.equal(r.금액, Math.floor(54_900_000 * 0.451));
});

test('감가상각: 신규 취득은 월할 (7월 취득 → 6/12)', () => {
  const 자산 = { 취득일: '2025-07-10', 취득가: 100_000_000, 기초누계: 0 };
  const r = 상각범위액(자산, { 방법: '정액', 내용연수: 5 }, 회사2025);
  assert.equal(r.월수, 6);
  assert.equal(r.금액, 10_000_000);
});

test('감가상각: 건축물에 정률법을 적용하면 에러 (별표4에 40년 정률률이 없음)', () => {
  const 자산 = { 취득일: '2020-01-01', 취득가: 500_000_000, 기초누계: 0 };
  assert.throws(() => 상각범위액(자산, { 방법: '정률', 내용연수: 40 }, 회사2025));
  assert.equal(상각률표[40].정률, null);
});

test('법인세율: 사업연도 개시일로 세율표가 자동 분기 (2025 세제개편)', () => {
  assert.equal(법인세율구간('2025-01-01')[0].율, 0.09);
  assert.equal(법인세율구간('2026-01-01')[0].율, 0.10);
  assert.equal(법인세율구간('2026-01-01')[3].율, 0.25);
});

// ── ② 내부 정합성 ──────────────────────────────────────
test('시산표: 대차평형 (차변합계 = 대변합계)', () => {
  const r = runPipeline();
  assert.equal(r.stage2.시산표.대차평형, true);
  assert.equal(r.stage2.시산표.합계.차변합계, r.stage2.시산표.합계.대변합계);
});

test('재무상태표: 자산 = 부채 + 자본', () => {
  const r = runPipeline();
  assert.equal(r.stage3.재무상태표.대차일치, true);
  assert.equal(r.stage3.재무상태표.자산.총계, r.stage3.재무상태표.부채와자본총계);
});

test('순환 참조: 법인세비용 루프가 수렴한다', () => {
  const r = runPipeline();
  const 마지막 = r.수렴.회차기록.at(-1);
  assert.equal(마지막.수렴, true);
  assert.ok(r.수렴.반복횟수 <= 5, '5회 이내 수렴');
});

test('순환 참조: 법인세비용은 손금불산입이라 각사업연도소득이 불변 → 2회차 수렴', () => {
  const r = runPipeline();
  const 소득들 = r.수렴.회차기록.map((x) => x.각사업연도소득);
  assert.equal(new Set(소득들).size, 1, '모든 회차의 각사업연도소득이 동일해야 함');
  assert.equal(r.수렴.반복횟수, 2);
});

test('별지3: 각사업연도소득 = 당기순이익 + 가산 - 차감', () => {
  const r = runPipeline();
  const b = r.stage4.별지3;
  assert.equal(b.각사업연도소득, b.당기순이익 + b.가산계 - b.차감계);
});

test('별지3: 차감납부세액 = 산출세액 - 기납부세액', () => {
  const r = runPipeline();
  const b = r.stage4.별지3;
  assert.equal(b.차감납부세액, b.산출세액 - b.기납부세액);
});

test('소득금액조정합계표: 모든 조정에 소득처분과 근거가 붙어 있다', () => {
  const r = runPipeline();
  assert.ok(r.stage4.조정.length > 0);
  for (const a of r.stage4.조정) {
    assert.ok(a.소득처분, `${a.과목}에 소득처분 없음`);
    assert.ok(a.근거, `${a.과목}에 근거 없음`);
  }
});

// ── ③ 법적 제약 강제 (절세 엔진의 안전장치) ─────────────
test('절세 엔진: 방법고정 자산은 결정 변수에서 원천 배제된다', () => {
  const 변수 = 결정변수();
  const 건물 = 변수.find((v) => v.자산.includes('건물'));
  const 승용차 = 변수.find((v) => v.자산.includes('승용차'));
  const 비품 = 변수.find((v) => v.자산.includes('비품'));

  assert.equal(건물.선택가능, false, '건축물은 정액법만 → 선택 불가');
  assert.equal(승용차.선택가능, false, '업무용승용차는 5년 정액 강제 → 선택 불가');
  assert.equal(비품.선택가능, true, '당기 신규 취득 → 선택 가능');
});

test('절세 엔진: 방법고정 자산에 사용자 선택을 강제 주입해도 무시된다', () => {
  // 건물(A01)에 정률법 4년을 억지로 주입 — 불법 조합
  const 정상 = runPipeline();
  const 주입 = runPipeline({ 사용자선택: { A01: { 방법: '정률', 내용연수: 4 } } });
  const 건물상각 = (r) => r.stage2.감가.find((d) => d.자산id === 'A01');

  assert.equal(건물상각(주입).방법, '정액', '주입해도 법정 방법이 강제됨');
  assert.equal(건물상각(주입).내용연수, 40);
  assert.equal(건물상각(주입).금액, 건물상각(정상).금액);
  assert.equal(주입.stage4.별지3.과세표준, 정상.stage4.별지3.과세표준, '세액이 바뀌지 않아야 함');
});

test('절세 엔진: 내용연수 후보가 기준 ±25% 범위 안에만 있다 (비품 5년 → 4~6년)', () => {
  const 비품 = 결정변수().find((v) => v.자산.includes('비품'));
  assert.deepEqual(비품.연수후보, [4, 5, 6]);
});

test('절세 시나리오: 적법 조합만 생성되고 전부 계산된다', () => {
  const s = runScenarios();
  assert.equal(s.결과.length, 6, '정액/정률 × 4/5/6년 = 6조합');
  assert.equal(s.배제된변수.length, 2, '건물·승용차는 배제');
  for (const r of s.결과) assert.ok(r.총납부액 > 0 && r.근거);
});

test('절세 시나리오: 상각비가 클수록 세액이 작다 (단조성)', () => {
  const s = runScenarios();
  const 정렬 = [...s.결과].sort((a, b) => b.당기상각비 - a.당기상각비);
  for (let i = 1; i < 정렬.length; i++) {
    assert.ok(정렬[i - 1].총납부액 <= 정렬[i].총납부액, '상각비 ↑ → 세액 ↓');
  }
});

test('절세 시나리오: 과세이연 경고가 반드시 포함된다', () => {
  const s = runScenarios();
  assert.ok(s.경고.some((w) => w.유형 === '과세이연'), '과세이연 경고 필수');
  assert.ok(s.경고.some((w) => w.유형 === '판단 주체'), '세무사 판단 고지 필수');
});

// ── ④ 1단계 분개 판정의 무게 ────────────────────────────
test('분개 판정: 보증금을 수익으로 오분개하면 소득이 1,000만원 과대계상된다', () => {
  const i = 분개영향();
  const [정답, 오답] = i.케이스;
  assert.equal(오답.과세표준 - 정답.과세표준, 10_000_000);
  assert.equal(i.세액차이, 990_000, '법인세 9% + 지방 0.9% = 9.9%');
});

test('1단계: 확인 큐 답변이 파이프라인 전체를 다시 굴린다', () => {
  const a = runPipeline({ 큐답변: { Q1: '임대보증금' } });
  const b = runPipeline({ 큐답변: { Q1: '임대료수입' } });
  assert.notEqual(a.stage5.총납부액, b.stage5.총납부액);
  assert.equal(a.stage2.시산표.대차평형, true, '오분개해도 대차는 맞는다');
  assert.equal(b.stage2.시산표.대차평형, true, '← 대차평형이 계정 착오를 못 잡는 증거');
});

test('1단계: 증빙유형 태그가 전표에 보존된다 (4단계 적격증빙 판정의 입력)', () => {
  const r = runPipeline();
  const 추진비전표 = r.stage1.전표.filter((e) => e.분개.some((l) => l.계정 === '604'));
  assert.ok(추진비전표.length > 0);
  for (const e of 추진비전표) assert.ok(e.증빙유형, '증빙유형 태그 누락');
  assert.equal(r.stage4.명세.기업업무추진비.증빙불비, 500_000);
});

// ── ⑤ 소규모 임대법인 특례 ──────────────────────────────
test('소규모 임대법인 3요건 → 승용차 감가상각 한도가 800만 → 400만으로 절반', () => {
  const r = runPipeline();
  const c = r.stage4.명세.업무용승용차;
  assert.equal(c.소규모, true);
  assert.equal(c.감가한도, 4_000_000);
  assert.equal(c.감가초과, 5_600_000);
});

test('소규모 임대법인 3요건 → 기업업무추진비 한도가 50%로 축소', () => {
  const r = runPipeline();
  const k = r.stage4.명세.기업업무추진비;
  assert.equal(k.소규모, true);
  assert.equal(k.한도, Math.floor((36_000_000 + 468_000) * 0.5));
});
