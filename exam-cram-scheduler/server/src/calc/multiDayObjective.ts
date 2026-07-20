// 3주차 월요일 "다중 시험 최적화 — 목적함수 구현"(#11)
// #10(multiDayCandidates.ts)이 만든 축에서 값을 하나씩 골라 완성한 "구체적인 스케줄
// 하나"를 받아서, 그 스케줄이 전체 시험기간 동안 얼마나 좋은지 점수 하나로 채점한다.
//
// 여러 시험 점수를 하나로 합칠 때는 최솟값(min)을 쓰기로 했다(2026-07-20 결정) — 가장
// 컨디션 나쁠 시험을 최대한 끌어올리는 방향. alertness.ts를 시험 시각마다 반복 호출해서
// 조합하는 방식이고, caffeineConcentration.ts가 "섭취 전엔 농도 0"을 이미 보장하므로,
// 시험마다 doses를 "그 시점까지 마신 것만" 걸러낼 필요 없이 전체 doses를 그대로 넘기면
// 된다(아직 안 마신 카페인은 alertness() 안에서 자동으로 효과 0으로 계산됨).
import { alertness } from "./alertness.js";
import { buildMultiNightSegments, segmentAt } from "./candidateSleepSegments.js";
import type { CaffeineDose } from "./caffeineConcentration.js";
import type { NightCandidate } from "./multiDayCandidates.js";

export interface MultiDayScheduleCandidate {
  /**
   * 이미 "선택된" 밤들 — 후보 목록이 아니라 구체적인 취침/기상 시각 하나씩.
   * night[i].bedTime = habitualBedTime + 24×i, night[i].wakeTime = habitualWakeTime + 24×(i+1)
   * 형태의 연속 타임라인 좌표를 따라야 한다(multiDayCandidates.ts와 동일한 규칙).
   */
  nights: NightCandidate[];
  /** 이미 "선택된" 카페인 섭취 시각·용량 목록 */
  doses: CaffeineDose[];
}

export interface ExamScore {
  examTime: number;
  score: number;
}

export interface MultiDayObjectiveInput {
  habitualBedTime: number;
  habitualWakeTime: number;
  schedule: MultiDayScheduleCandidate;
  /** 시험 시각들. nights와 같은 연속 타임라인 좌표계를 써야 한다. */
  examTimes: number[];
  bodyWeightKg: number;
  halfLifeHours: number;
  warmupDays?: number;
}

export interface MultiDayObjectiveResult {
  examScores: ExamScore[];
  /** 시험별 점수의 최솟값(2026-07-20 결정) — 가장 컨디션 나쁠 시험 기준 */
  score: number;
}

export function scoreMultiDaySchedule(input: MultiDayObjectiveInput): MultiDayObjectiveResult {
  const { habitualBedTime, habitualWakeTime, schedule, examTimes, bodyWeightKg, halfLifeHours, warmupDays } = input;

  const segments = buildMultiNightSegments(habitualBedTime, habitualWakeTime, schedule.nights, warmupDays);

  const examScores = examTimes.map((examTime) => {
    const segment = segmentAt(segments, examTime);
    const score = alertness(examTime, segment, schedule.doses, bodyWeightKg, halfLifeHours);
    return { examTime, score };
  });

  const score = Math.min(...examScores.map((exam) => exam.score));

  return { examScores, score };
}
