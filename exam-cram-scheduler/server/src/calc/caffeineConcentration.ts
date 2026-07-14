// 계산_모델_리서치.md 2.1 "약동학(PK) — 혈중 카페인 농도"
// 섭취 1건에 대한 혈중농도만 계산하는 순수함수. 하루에 여러 번 섭취했을 때 농도를 합산(중첩)하는 건
// 이 함수를 호출하는 쪽(alertness.ts)의 책임으로 둔다 — 약동학적으로 여러 섭취의 농도는 그냥 더하면 되기 때문.
const F = 1; // 생체이용률. 경구 카페인은 거의 완전 흡수(~99%)됨
const KA = 5; // 흡수 속도 상수(/h). 음료 기준 최고 혈중농도 도달 시간(39~42분)을 역산해서 도출
const VD_PER_KG = 0.7; // 분포용적(L/kg). NCBI Bookshelf 자료 기준

export interface CaffeineDose {
  /** 섭취 시각. 자정 기준 경과 시간(0~24+) */
  time: number;
  /** 섭취량(mg) */
  amountMg: number;
}

export function caffeineConcentration(
  t: number,
  dose: CaffeineDose,
  bodyWeightKg: number,
  halfLifeHours: number,
): number {
  const elapsed = t - dose.time;
  if (elapsed < 0) return 0; // 섭취 전엔 혈중농도 0

  const vd = bodyWeightKg * VD_PER_KG;
  const ke = Math.log(2) / halfLifeHours;

  return (
    (F * dose.amountMg * KA) /
    (vd * (KA - ke)) *
    (Math.exp(-ke * elapsed) - Math.exp(-KA * elapsed))
  );
}
