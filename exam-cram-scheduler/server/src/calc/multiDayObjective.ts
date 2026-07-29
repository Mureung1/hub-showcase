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
import { computeStudyShortfall, type ExamStudyNeed, type ExamStudyResult } from "./studyReservation.js";

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
   * ① 밤별 최소 수면시간(2026-07-30). 넘기면 밤 인덱스별로 minSleepHours 대신 이 값을 쓴다
   * (해당 인덱스가 없거나 undefined면 minSleepHours로, 그것도 없으면 0으로 떨어진다).
   * 조정 화면에서 "이 밤은 최소 N시간"처럼 밤마다 다르게 걸 수 있게 하려고 배열로 받는다.
   */
  minSleepHoursByNight?: number[];
  /**
   * ② 시험별 남은 공부량(2026-07-30). examTimes와 같은 연속 좌표계를 쓴다(순서는 무관 —
   * studyReservation이 시각순으로 정렬한다). 주면 시험별 공부 부족 시간을 함께 계산한다.
   */
  studyNeeds?: ExamStudyNeed[];
  /** ② 공부를 시작할 수 있는 가장 이른 시각(연속 좌표, 보통 "지금"). studyNeeds가 있을 때만 쓰인다. */
  studyWindowStart?: number;
  /**
   * ② true면 공부 부족분을 점수에서 깎는다("공부 시간 확보" 선택). false/미지정이면 부족분을
   * 계산해서 결과에 담기만 하고 점수에는 반영하지 않는다(경고만 띄우는 기본 동작).
   */
  enforceStudyTime?: boolean;
  /**
   * #15 — 검색 대상이 아니지만 항상 혈중농도 계산에 포함되어야 하는 카페인(예: 오늘
   * 이미 마신 커피). schedule.doses(검색 중인 후보)와 합쳐서 alertness()에 넘기되,
   * 반환하는 examScores/score에만 반영되고 schedule 자체(추천 목록)에는 안 섞인다.
   */
  fixedDoses?: CaffeineDose[];
  /**
   * 하루 안전 섭취 한도(mg). 넘기면 이 한도를 넘는 날에 패널티를 준다(#3, 2026-07-22).
   * 안 넘기면 패널티 없음(기존 동작 그대로).
   */
  dailyLimitMg?: number;
}

export interface MultiDayObjectiveResult {
  examScores: ExamScore[];
  /** 최소 수면시간에 못 미친 밤들의 부족분 합(시간). 패널티 계산 근거를 그대로 노출. */
  sleepShortfallHours: number;
  /** 자는 동안 마시게 된 카페인들이 "기상까지 남은 시간"의 합(시간). 0이면 문제 없음. */
  asleepDoseHours: number;
  /** 하루 안전 한도를 넘은 양의 합(mg). 날짜별로 계산해서 더한다. 0이면 문제 없음. */
  dailyExcessMg: number;
  /** ② 시험별 공부 부족 시간의 합(시간). studyNeeds를 안 주면 0. */
  studyShortfallHours: number;
  /** ② 시험별 공부 필요/확보/부족 내역. studyNeeds를 안 주면 빈 배열. */
  studyShortfallByExam: ExamStudyResult[];
  /** 시험별 점수의 최솟값에서 수면 부족·수면 중 섭취·한도 초과·(선택 시)공부 부족 패널티를 뺀 최종 점수 */
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

// #3 — 섭취량을 탐색 대상으로 열었더니(2026-07-22) 목적함수에는 "카페인이 많을수록
// 각성도가 높다"만 있고 안전 한도가 없어서 추천이 상한으로 몰렸다. 한도는 계산이 끝난 뒤
// 경고 문구로만 쓰이고 있었는데, "많이 마셔라 → 그런데 위험하다"는 앞뒤가 안 맞는 결과다.
// 한도를 넘는 양에 비례해 깎아서 탐색 단계에서부터 피하게 한다.
// 100mg 초과 = 0.5점 감점 — 시험 각성도 차이(대개 0.01~0.05)보다 훨씬 커서 사실상
// 한도를 지키는 쪽이 항상 이긴다. 안전 관련 제약이므로 의도적으로 세게 잡았다.
const DAILY_EXCESS_PENALTY_PER_MG = 0.005;

// ② 공부 시간 확보 패널티(2026-07-30) — 사용자가 "공부 시간 확보"를 택했을 때만(enforceStudyTime)
// 켜진다. 최소수면 패널티(0.5/h)가 "더 자라"고 잡아당기는 것과 반대로, "덜 자고 더 깨어있어라"
// 방향으로 잡아당긴다. 사용자가 경고를 보고도 명시적으로 공부를 택한 상황이므로 최소수면을
// 이길 수 있게 더 세게(1.0/h) 잡았다 — 근거 있는 상수가 아니라 근사치이고,
// verifyStudyReservation.ts로 실제로 잠이 줄어드는지 확인하며 조정한다.
const STUDY_SHORTFALL_PENALTY_PER_HOUR = 1.0;

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
    minSleepHoursByNight,
    studyNeeds,
    studyWindowStart,
    enforceStudyTime,
    fixedDoses,
    dailyLimitMg,
  } = input;

  const segments = buildMultiNightSegments(habitualBedTime, habitualWakeTime, schedule.nights, warmupDays);
  const allDoses = fixedDoses ? [...fixedDoses, ...schedule.doses] : schedule.doses;

  const examScores = examTimes.map((examTime) => {
    const segment = segmentAt(segments, examTime);
    const score = alertness(examTime, segment, allDoses, bodyWeightKg, halfLifeHours);
    return { examTime, score };
  });

  // ① 밤별 최소 수면시간 우선 — 밤 인덱스에 값이 있으면 그걸, 없으면 전역 minSleepHours,
  // 그것도 없으면 0(패널티 없음)을 쓴다.
  const sleepShortfallHours = schedule.nights.reduce((sum, night, nightIndex) => {
    const floor = minSleepHoursByNight?.[nightIndex] ?? minSleepHours ?? 0;
    const sleptHours = night.wakeTime - night.bedTime;
    return sum + Math.max(0, floor - sleptHours);
  }, 0);

  // 추천 카페인만 검사한다 — fixedDoses는 사용자가 이미 마신 것이라 바꿀 수 없다.
  const asleepDoseHours = schedule.doses.reduce((sum, dose) => {
    const 자는중인밤 = schedule.nights.find(
      (night) => dose.time >= night.bedTime && dose.time < night.wakeTime,
    );
    return sum + (자는중인밤 ? 자는중인밤.wakeTime - dose.time : 0);
  }, 0);

  // 하루 한도는 "그날 마신 전부"가 기준이므로 이미 마신 것(fixedDoses)까지 합쳐서 센다.
  // 연속 좌표에서 날짜는 24로 나눈 몫이다(0일차 = 오늘).
  const dailyExcessMg = (() => {
    if (dailyLimitMg === undefined) return 0;
    const 날짜별합 = new Map<number, number>();
    for (const dose of allDoses) {
      const 날짜 = Math.floor(dose.time / 24);
      날짜별합.set(날짜, (날짜별합.get(날짜) ?? 0) + dose.amountMg);
    }
    let 초과 = 0;
    for (const 합 of 날짜별합.values()) {
      초과 += Math.max(0, 합 - dailyLimitMg);
    }
    return 초과;
  })();

  // ② 시험별 공부 부족 시간. studyNeeds를 안 주면 계산하지 않는다(기존 동작 그대로).
  const study =
    studyNeeds && studyNeeds.length > 0
      ? computeStudyShortfall(segments, studyNeeds, studyWindowStart ?? 0)
      : { total: 0, byExam: [] };

  const score =
    Math.min(...examScores.map((exam) => exam.score)) -
    SLEEP_SHORTFALL_PENALTY_PER_HOUR * sleepShortfallHours -
    ASLEEP_DOSE_PENALTY_PER_HOUR * asleepDoseHours -
    DAILY_EXCESS_PENALTY_PER_MG * dailyExcessMg -
    // 공부 부족 패널티는 사용자가 "확보"를 택했을 때만 점수에 반영한다.
    (enforceStudyTime ? STUDY_SHORTFALL_PENALTY_PER_HOUR * study.total : 0);

  return {
    examScores,
    sleepShortfallHours,
    asleepDoseHours,
    dailyExcessMg,
    studyShortfallHours: study.total,
    studyShortfallByExam: study.byExam,
    score,
  };
}
