// 계산_모델_리서치.md 1장 "결합 공식(P0)" — 카페인 없을 때 기본 각성도
import { sleepPressure, type SleepPressureSegment } from "./processS.js";
import { circadianRhythm } from "./processC.js";
import { sleepInertia } from "./sleepInertia.js";

const KAPPA = 0.2; // 일주기 진폭 계수. 논문 원값 미확보 — 근사치(2026-07-13 결정)

export function baselineAlertness(t: number, segment: SleepPressureSegment): number {
  // sleepPressure는 "피로도"(클수록 피곤함)라서, 각성도로 쓰려면 뒤집어야 함(1 - 피로도).
  // 안 뒤집으면 "많이 깨어있을수록 각성도가 높다"는 반대 결과가 나오는 걸 검증 중 확인함(2026-07-13)
  return (1 - sleepPressure(t, segment)) + KAPPA * circadianRhythm(t) + sleepInertia(t, segment);
}
