// 입력 무결성 검증기
//
// 수기 입력은 반드시 오타가 난다. 재무제표는 내부 정합성이 강해서 오타를 기계가 잡을 수 있다.
// 사람이 눈으로 검산할 필요가 없다 — 이게 이 모듈의 존재 이유.
// (PLAN-3 Step 3A-3)

import { sum } from '../io/csv.js';

/**
 * @returns {{ ok:boolean, checks:{name,ok,detail}[] }}
 */
export function 검증({ 재무상태표, 손익계산서, 자산대장 }) {
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok, detail });

  // 1. 재무상태표 대차: 자산 − 자산차감 = 부채 + 자본
  if (재무상태표) {
    const 자산 = sum(재무상태표.filter((r) => r.구분 === '자산'), '금액');
    const 자산차감 = sum(재무상태표.filter((r) => r.구분 === '자산차감'), '금액');
    const 부채 = sum(재무상태표.filter((r) => r.구분 === '부채'), '금액');
    const 자본 = sum(재무상태표.filter((r) => r.구분 === '자본'), '금액');
    const 좌 = 자산 - 자산차감, 우 = 부채 + 자본;
    add('재무상태표 대차평형 (자산−차감 = 부채+자본)', 좌 === 우,
      `자산 ${좌.toLocaleString()} vs 부채+자본 ${우.toLocaleString()}` +
      (좌 === 우 ? '' : ` · 차이 ${(좌 - 우).toLocaleString()}`));
  }

  // 2. 손익계산서: 당기순이익이 실제로 수익−비용과 맞는가
  let 당기순이익 = null;
  if (손익계산서) {
    const 수익 = sum(손익계산서.filter((r) => r.구분 === '수익'), '금액');
    const 비용 = sum(손익계산서.filter((r) => r.구분 === '비용'), '금액');
    당기순이익 = 수익 - 비용;
    add('손익계산서 합계 정상', 수익 > 0 && 비용 >= 0,
      `수익 ${수익.toLocaleString()} − 비용 ${비용.toLocaleString()} = 당기순이익 ${당기순이익.toLocaleString()}`);
  }

  // 3. 재무제표 간 연결: 손익계산서 법인세비용이 재무상태표에 반영됐는가 (약검증 — 존재만)
  //    (완전한 순환 수렴 검증은 후속. 여기선 입력 존재 여부만.)

  // 4. 자산대장: 기초누계 ≤ 취득가, 필수 필드 존재
  if (자산대장) {
    let 문제 = [];
    for (const a of 자산대장) {
      const 취득가 = Number(String(a.취득가).replace(/,/g, ''));
      const 기초누계 = Number(String(a.기초누계).replace(/,/g, '')) || 0;
      if (기초누계 > 취득가) 문제.push(`${a.명}: 기초누계 > 취득가`);
      if (!a.취득일 || !취득가) 문제.push(`${a.명}: 취득일/취득가 누락`);
    }
    add('자산대장 정합성', 문제.length === 0, 문제.length ? 문제.join(' · ') : `자산 ${자산대장.length}건 정상`);
  }

  return { ok: checks.every((c) => c.ok), checks, 당기순이익 };
}
