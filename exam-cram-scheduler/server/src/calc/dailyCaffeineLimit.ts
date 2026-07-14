// 개발_일정.md 2주차 목요일 "안전 섭취 한도 로직(연령·건강상태별 한도)"
// 나이·임신·심장질환·불안불면 여부를 보고 그날의 카페인 섭취 한도(mg)를 계산한다.
export interface HealthProfile {
  age: number;
  pregnant: boolean;
  heartCondition: boolean;
  anxiety: boolean;
}

const ADULT_DEFAULT_MG = 400; // 건강한 성인 일반. 출처: FDA
const MINOR_MG = 100; // 12~18세. 출처: AAP(미국소아과학회) 계열 권고
const CHILD_MG = 0; // 12세 미만. 공개 자료 기준 섭취 자제 권고를 한도 0으로 반영
const RESTRICTED_CONDITION_MG = 200; // 임신·심장질환·불안불면 공통. 임신은 ACOG 기준, 심장질환·불안불면은 공식 고정 수치가 없어 같은 보수적 수치로 근사(2026-07-14 결정)

function ageBasedLimit(age: number): number {
  if (age < 12) return CHILD_MG;
  if (age <= 18) return MINOR_MG;
  return ADULT_DEFAULT_MG;
}

/** 여러 조건이 겹치면 그중 가장 엄격한(가장 낮은) 한도 하나만 적용한다. */
export function dailyCaffeineLimit(profile: HealthProfile): number {
  const candidateLimits = [ageBasedLimit(profile.age)];
  if (profile.pregnant) candidateLimits.push(RESTRICTED_CONDITION_MG);
  if (profile.heartCondition) candidateLimits.push(RESTRICTED_CONDITION_MG);
  if (profile.anxiety) candidateLimits.push(RESTRICTED_CONDITION_MG);

  return Math.min(...candidateLimits);
}
