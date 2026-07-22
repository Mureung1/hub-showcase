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
  /**
   * #15 — 검색 대상이 아니지만 항상 혈중농도 계산에 포함되어야 하는 카페인(예: 오늘
   * 이미 마신 커피). schedule.doses(검색 중인 후보)와 합쳐서 alertness()에 넘기되,
   * 반환하는 examScores/score에만 반영되고 schedule 자체(추천 목록)에는 안 섞인다.
   */
  fixedDoses?: CaffeineDose[];
}

export interface MultiDayObjectiveResult {
  examScores: ExamScore[];
  /** 최소 수면시간에 못 미친 밤들의 부족분 합(시간). 패널티 계산 근거를 그대로 노출. */
  sleepShortfallHours: number;
  /** 자는 동안 마시게 된 카페인들이 "기상까지 남은 시간"의 합(시간). 0이면 문제 없음. */
  asleepDoseHours: number;
  /** 시험별 점수의 최솟값에서 수면 부족·수면 중 섭취 패널티를 뺀 최종 점수 */
  score: number;
}

const SLEEP_SHORTFALL_PENALTY_PER_HOUR = 0.5; // 근거 없는 근사치(2026-07-21) — verifyMinSleepPenalty.ts로 조정

// 자고 있는 동안 카페인을 마시는 건 실행 불가능한 스케줄이다. multiDayCandidates.ts가
// 후보를 만들 때 "평소 기상 시각" 기준으로 걸러내지만, 탐색이 기상을 평소보다 최대 1시간
// 늦추면 그 사이에 낀 섭취 시각이 그대로 남는다(2026-07-22 발견: 기상 07:45인데 07:15
// 섭취 추천). 후보 단계에서는 실제 기상 시각을 모르므로, 둘 다 정해진 이 채점 단계에서
// 패널티로 밀어낸다 — 이 파일 상단 주석의 "제약은 #11에서 패널티로" 방침과 같은 방식.
// 기상까지 남은 시간에 비례해서 깎아야 탐색이 "더 늦게 마시는" 방향을 찾아갈 수 있다.
const ASLEEP_DOSE_PENALTY_PER_HOUR = 1.0;

export function scoreMultiDaySchedule(input: MultiDayObjectiveInput): MultiDayObjectiveResult {
  const {
    habitualBedTime,
    habitualWakeTime,
    schedule,
    examTimes,
    bodyWeightKg,
    halfLifeHours,
    warmupDays,
    minSleepHours,
    fixedDoses,
  } = input;

  const segments = buildMultiNightSegments(habitualBedTime, habitualWakeTime, schedule.nights, warmupDays);
  const allDoses = fixedDoses ? [...fixedDoses, ...schedule.doses] : schedule.doses;

  const examScores = examTimes.map((examTime) => {
    const segment = segmentAt(segments, examTime);
    const score = alertness(examTime, segment, allDoses, bodyWeightKg, halfLifeHours);
    return { examTime, score };
  });

  const sleepShortfallHours = schedule.nights.reduce((sum, night) => {
    const sleptHours = night.wakeTime - night.bedTime;
    return sum + Math.max(0, (minSleepHours ?? 0) - sleptHours);
  }, 0);

  // 추천 카페인만 검사한다 — fixedDoses는 사용자가 이미 마신 것이라 바꿀 수 없다.
  const asleepDoseHours = schedule.doses.reduce((sum, dose) => {
    const 자는중인밤 = schedule.nights.find(
      (night) => dose.time >= night.bedTime && dose.time < night.wakeTime,
    );
    return sum + (자는중인밤 ? 자는중인밤.wakeTime - dose.time : 0);
  }, 0);

  const score =
    Math.min(...examScores.map((exam) => exam.score)) -
    SLEEP_SHORTFALL_PENALTY_PER_HOUR * sleepShortfallHours -
    ASLEEP_DOSE_PENALTY_PER_HOUR * asleepDoseHours;

  return { examScores, sleepShortfallHours, asleepDoseHours, score };
}
