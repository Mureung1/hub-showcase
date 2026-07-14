// 개발_일정.md 2주차 목요일 "오늘 섭취량 차감" — 하루 한도에서 이미 마신 양을 뺀 나머지를 계산한다.
import type { CaffeineDose } from "./caffeineConcentration.js";

export function remainingCaffeineBudget(dailyLimitMg: number, todaysDoses: CaffeineDose[]): number {
  const consumedMg = todaysDoses.reduce((sum, dose) => sum + dose.amountMg, 0);
  return dailyLimitMg - consumedMg;
}
