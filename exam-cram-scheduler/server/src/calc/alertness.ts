// 계산_모델_리서치.md 2.3 "최종 결합" — P(t) = P0(t) × gPD(t)
import { baselineAlertness } from "./baselineAlertness.js";
import { caffeineConcentration, type CaffeineDose } from "./caffeineConcentration.js";
import { caffeineEffect } from "./caffeineEffect.js";
import type { SleepPressureSegment } from "./processS.js";

export function alertness(
  t: number,
  segment: SleepPressureSegment,
  doses: CaffeineDose[],
  bodyWeightKg: number,
  halfLifeHours: number,
): number {
  const totalConcentration = doses.reduce(
    (sum, dose) => sum + caffeineConcentration(t, dose, bodyWeightKg, halfLifeHours),
    0,
  );

  return baselineAlertness(t, segment) * caffeineEffect(t, totalConcentration, segment);
}
