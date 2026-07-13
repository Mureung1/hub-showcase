// 계산_모델_리서치.md 1장 "결합 공식(P0)" — 카페인 없을 때 기본 각성도
import { sleepPressure, type SleepPressureSegment } from "./processS.js";
import { circadianRhythm } from "./processC.js";

const KAPPA = 0.2; // 일주기 진폭 계수. 논문 원값 미확보 — 근사치(2026-07-14 결정)

export function baselineAlertness(t: number, segment: SleepPressureSegment): number {
  return sleepPressure(t, segment) + KAPPA * circadianRhythm(t);
}
