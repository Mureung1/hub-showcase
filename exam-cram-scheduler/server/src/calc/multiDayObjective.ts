// 3주차 월요일 "다중 시험 최적화 — 목적함수 구현"(#11)
// #10(multiDayCandidates.ts)이 만든 축에서 값을 하나씩 골라 완성한 "구체적인 스케줄
// 하나"를 받아서, 그 스케줄이 전체 시험기간 동안 얼마나 좋은지 점수 하나로 채점한다.
//
// 여러 시험 점수를 하나로 합칠 때는 최솟값(min)을 쓰기로 했다(2026-07-20 결정) — 가장
// 컨디션 나쁠 시험을 최대한 끌어올리는 방향. alertness.ts를 시험 시각마다 반복 호출해서
// 조합하는 방식이고, caffeineConcentration.ts가 "섭취 전엔 농도 0"을 이미 보장하므로,
// 시험마다 doses를 "그 시점까지 마신 것만" 걸러낼 필요 없이 전체 doses를 그대로 넘기면
// 된다(아직 안 마신 카페인은 alertness() 안에서 자동으로 효과 0으로 계산됨).
//
// #21 "최소 수면시간 패널티" — 3주차_계획.md 2번(2026-07-20 결정)에서 "평가 단계(#11)
// 에서 패널티로 처리"하기로 했었는데 #11 구현 당시 빠뜨렸던 부분. 각 밤의 실제 수면시간이
// minSleepHours에 못 미치면, 부족한 시간(시간 단위)에 비례해서 최종 점수에서 깎는다.
// SLEEP_SHORTFALL_PENALTY_PER_HOUR 값은 KAPPA·GMAX_MIN/MAX처럼 근거가 있는 상수가
// 아니라 근사치 — verifyMinSleepPenalty.ts로 "타이트하게 잡으면 실제로 더 많이 재우는
// 스케줄이 선택되는지" 확인하며 필요하면 조정한다.
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
  /** 이 값보다 짧게 자는 밤이 있으면 패널티를 부과한다. 안 넘기면 패널티 없음(기존 동작 그대로). */
  minSleepHours?: number;
}

export interface MultiDayObjectiveResult {
  examScores: ExamScore[];
  /** 최소 수면시간에 못 미친 밤들의 부족분 합(시간). 패널티 계산 근거를 그대로 노출. */
  sleepShortfallHours: number;
  /** 시험별 점수의 최솟값에서 수면 부족 패널티를 뺀 최종 점수(2026-07-20 결정 + #21) */
  score: number;
}

const SLEEP_SHORTFALL_PENALTY_PER_HOUR = 0.1; // 근거 없는 근사치(2026-07-21) — verifyMinSleepPenalty.ts로 조정

export function scoreMultiDaySchedule(input: MultiDayObjectiveInput): MultiDayObjectiveResult {
  const { habitualBedTime, habitualWakeTime, schedule, examTimes, bodyWeightKg, halfLifeHours, warmupDays, minSleepHours } = input;

  const segments = buildMultiNightSegments(habitualBedTime, habitualWakeTime, schedule.nights, warmupDays);

  const examScores = examTimes.map((examTime) => {
    const segment = segmentAt(segments, examTime);
    const score = alertness(examTime, segment, schedule.doses, bodyWeightKg, halfLifeHours);
    return { examTime, score };
  });

  const sleepShortfallHours = schedule.nights.reduce((sum, night) => {
    const sleptHours = night.wakeTime - night.bedTime;
    return sum + Math.max(0, (minSleepHours ?? 0) - sleptHours);
  }, 0);

  const score = Math.min(...examScores.map((exam) => exam.score)) - SLEEP_SHORTFALL_PENALTY_PER_HOUR * sleepShortfallHours;

  return { examScores, sleepShortfallHours, score };
}
