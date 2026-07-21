// #15 — 결과 화면 그래프용 시간대별 각성도(P(t)) 배열을 만든다.
// verifyAlertnessCurve.ts(2주차)의 "15분 간격 샘플링" 방식을 다중 밤(#11) 버전으로
// 확장해 재사용 가능한 함수로 뽑아낸 것.
import { alertness } from "./alertness.js";
import { buildMultiNightSegments, segmentAt } from "./candidateSleepSegments.js";
import type { CaffeineDose } from "./caffeineConcentration.js";
import type { NightCandidate } from "./multiDayCandidates.js";

const SAMPLE_STEP_HOURS = 0.25; // 15분 간격 — 그리드 간격과 동일하게 유지

export interface AlertnessTimelineInput {
  habitualBedTime: number;
  habitualWakeTime: number;
  nights: NightCandidate[];
  doses: CaffeineDose[];
  bodyWeightKg: number;
  halfLifeHours: number;
  /** 샘플링 시작 시각(연속 좌표) */
  startTime: number;
  /** 샘플링 끝 시각(연속 좌표) */
  endTime: number;
  warmupDays?: number;
}

export interface AlertnessTimelinePoint {
  time: number;
  score: number;
}

export function buildAlertnessTimeline(input: AlertnessTimelineInput): AlertnessTimelinePoint[] {
  const { habitualBedTime, habitualWakeTime, nights, doses, bodyWeightKg, halfLifeHours, startTime, endTime, warmupDays } =
    input;

  const segments = buildMultiNightSegments(habitualBedTime, habitualWakeTime, nights, warmupDays);

  const points: AlertnessTimelinePoint[] = [];
  for (let t = startTime; t <= endTime + 1e-9; t += SAMPLE_STEP_HOURS) {
    const segment = segmentAt(segments, t);
    const score = alertness(t, segment, doses, bodyWeightKg, halfLifeHours);
    points.push({ time: t, score });
  }
  return points;
}
