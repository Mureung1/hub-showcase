// 계산_모델_리서치.md 2.2 "약력학(PD) — 농도 → 각성도 보정 계수"
import { sleepPressure, type SleepPressureSegment } from "./processS.js";

const GMAX_MIN = 0.05; /* 피로비율 0(안 피곤)일 때 최대 부스트. 근거 없는 근사치*/
const GMAX_MAX = 0.25; // 피로비율 1(많이 피곤)일 때 최대 부스트. 근거 없는 근사치
const EC50 = 2; // 반포화 농도(mg/L). 표준 200mg 섭취 시 최대혈중농도(4~6mg/L)의 절반 지점
const HILL_N = 1; // Hill 계수. 협동결합 없다고 가정한 단순 포화 곡선
const H_MIN = 0.17; // Process S의 H(t) 최솟값(가장 안 피곤)

function gmax(t: number, segment: SleepPressureSegment): number {
  const fatigueRatio = (sleepPressure(t, segment) - H_MIN) / (1 - H_MIN);
  return GMAX_MIN + (GMAX_MAX - GMAX_MIN) * fatigueRatio;
}

/** 카페인이 없으면(concentration=0) gPD(t)=1이라 P(t)=P0(t)로 자연스럽게 수렴한다. */
export function caffeineEffect(
  t: number,
  totalConcentration: number,
  segment: SleepPressureSegment,
): number {
  const Gmax = gmax(t, segment);
  const concentrationN = totalConcentration ** HILL_N;
  return 1 + (Gmax * concentrationN) / (EC50 ** HILL_N + concentrationN);
}
