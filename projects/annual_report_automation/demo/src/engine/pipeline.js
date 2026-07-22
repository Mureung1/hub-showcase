// 파이프라인 오케스트레이션 — 1~5단계 + 수렴 루프
//
// ⚠️ 2·3·4단계는 일직선 파이프라인이 아니라 **수렴 루프**다:
//    법인세비용을 계상해야 → 당기순이익이 확정되고
//    당기순이익이 확정돼야 → 세무조정으로 세액이 나오고
//    세액이 나와야      → 법인세비용을 계상할 수 있다
//    → 반복 계산으로 수렴시킨다. (PLAN-2-결산.md §4)

import { 회사, 기초잔액, 자산대장, 통장내역 } from '../data/mock.js';
import { runStage1 } from './stage1-journal.js';
import { runStage2 } from './stage2-closing.js';
import { runStage3 } from './stage3-statements.js';
import { runStage4 } from './stage4-tax.js';
import { runStage5 } from './stage5-filing.js';

const 최대반복 = 5;

/**
 * @param {object} opts
 * @param {object} opts.사용자선택 - { 자산id: { 방법, 내용연수 } } 절세 시나리오 변수
 * @param {object} opts.큐답변     - { 큐키: '선택값' } 사람 확인 큐 답변
 */
export function runPipeline({ 사용자선택 = {}, 큐답변 = {} } = {}) {
  let 법인세비용 = 0;
  const 회차기록 = [];
  let s1, s2, s3, s4;

  for (let i = 1; i <= 최대반복; i++) {
    s1 = runStage1(통장내역, 큐답변);
    s2 = runStage2({ 전표: s1.전표, 기초잔액, 자산대장, 회사, 사용자선택, 법인세비용 });
    s3 = runStage3({ 시산표: s2.시산표 });
    s4 = runStage4({
      시산표: s2.시산표, 재무제표: s3, 자산대장,
      전표: s1.전표, 회사, 사용자선택, 감가: s2.감가,
    });

    const 산출 = s4.법인세비용합계;
    const 수렴 = Math.abs(산출 - 법인세비용) < 1;

    회차기록.push({
      회차: i,
      투입법인세비용: 법인세비용,
      당기순이익: s3.손익계산서.당기순이익,
      각사업연도소득: s4.별지3.각사업연도소득,
      과세표준: s4.별지3.과세표준,
      산출법인세비용: 산출,
      수렴,
    });

    if (수렴) break;
    법인세비용 = 산출;
  }

  const s5 = runStage5({ 별지3: s4.별지3, 지방소득세: s4.지방소득세, 회사 });

  return {
    회사,
    stage1: s1, stage2: s2, stage3: s3, stage4: s4, stage5: s5,
    수렴: { 회차기록, 반복횟수: 회차기록.length, 최종법인세비용: s4.법인세비용합계 },
  };
}

/** 요약 지표 — 대시보드용 */
export function 요약(r) {
  return {
    회사: r.회사.상호,
    사업연도: `${r.회사.사업연도개시일} ~ ${r.회사.사업연도종료일}`,
    거래건수: r.stage1.통계.총거래,
    자동화율: r.stage1.통계.자동화율_건수,
    사람확인: r.stage1.통계.사람확인,
    대차평형: r.stage2.시산표.대차평형,
    당기순이익: r.stage3.손익계산서.당기순이익,
    각사업연도소득: r.stage4.별지3.각사업연도소득,
    과세표준: r.stage4.별지3.과세표준,
    산출세액: r.stage4.별지3.산출세액,
    차감납부세액: r.stage4.별지3.차감납부세액,
    지방소득세: r.stage4.지방소득세.산출세액,
    총납부액: r.stage5.총납부액,
    조정건수: r.stage4.조정.length,
    수렴회차: r.수렴.반복횟수,
  };
}
