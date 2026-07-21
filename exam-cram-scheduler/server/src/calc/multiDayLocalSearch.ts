// 3주차 월요일 "다중 시험 최적화 — 로컬 탐색 휴리스틱 구현"(#12)
// #10(multiDayCandidates.ts)이 만든 축과 #11(multiDayObjective.ts)의 채점 함수를 이용해,
// 전체 조합을 다 뒤지지 않고 simulated annealing류 로컬 탐색으로 근사 최적 스케줄을 찾는다.
//
// 각 밤의 "취침"·"기상", 그리고 각 "카페인"을 각각 축 하나로 보고(#23 — 취침과 기상을
// 분리), 매 반복마다 축 하나를 무작위로 골라 그 축 안에서 인접한 값으로 옮겨본 뒤(이웃),
// #11로 채점해서 더 좋으면 이동하고 나쁘더라도 온도에 따른 확률로 가끔 이동한다. 온도는
// 반복이 진행될수록 기하급수적으로 낮아져서, 후반부에는 사실상 "더 좋은 이웃으로만
// 이동"하는 상태로 수렴한다.
import { scoreMultiDaySchedule } from "./multiDayObjective.js";
import type { CaffeineDose } from "./caffeineConcentration.js";
import type { MultiDayCandidates, NightCandidate } from "./multiDayCandidates.js";

export interface LocalSearchInput {
  habitualBedTime: number;
  habitualWakeTime: number;
  candidates: MultiDayCandidates;
  examTimes: number[];
  bodyWeightKg: number;
  halfLifeHours: number;
  warmupDays?: number;
  minSleepHours?: number;
  fixedDoses?: CaffeineDose[];
  /** 담금질 1회당 반복 횟수 */
  iterations?: number;
  /** 무작위 초기값에서 담금질을 몇 번 다시 시작해 그중 최고를 취할지(#23) */
  restarts?: number;
  initialTemperature?: number;
  finalTemperature?: number;
}

export interface LocalSearchResult {
  nights: NightCandidate[];
  doses: CaffeineDose[];
  score: number;
}

// #23 — 취침·기상을 독립 축으로 분리하면서 탐색 차원이 늘어, 단일 담금질로는 국소
// 최적점에 빠진 실행이 생겨 결과 편차가 커졌다. 무작위 재시작 후 최고값을 취하는 방식이
// 반복 횟수만 늘리는 것보다 훨씬 적은 계산으로 편차를 잡는다(측정으로 확인, 2026-07-21):
// 8회 재시작 × 500반복이면 sd≈0.001, 30ms/회 수준.
const DEFAULT_ITERATIONS = 500;
const DEFAULT_RESTARTS = 8;
const DEFAULT_INITIAL_TEMPERATURE = 0.1;
const DEFAULT_FINAL_TEMPERATURE = 0.001;

function randomIndex(length: number): number {
  return Math.floor(Math.random() * length);
}

/** currentIndex의 바로 옆(±1) 인덱스로 옮긴다. 경계에 있으면 안쪽 방향으로만 이동한다. */
function neighborIndex(currentIndex: number, length: number): number {
  if (length <= 1) return currentIndex;
  const step = Math.random() < 0.5 ? -1 : 1;
  const next = currentIndex + step;
  if (next < 0 || next >= length) return currentIndex - step;
  return next;
}

type Axis =
  | { kind: "bed"; nightIndex: number }
  | { kind: "wake"; nightIndex: number }
  | { kind: "dose"; doseIndex: number };

export function searchMultiDaySchedule(input: LocalSearchInput): LocalSearchResult {
  const {
    habitualBedTime,
    habitualWakeTime,
    candidates,
    examTimes,
    bodyWeightKg,
    halfLifeHours,
    warmupDays,
    minSleepHours,
    fixedDoses,
    iterations = DEFAULT_ITERATIONS,
    restarts = DEFAULT_RESTARTS,
    initialTemperature = DEFAULT_INITIAL_TEMPERATURE,
    finalTemperature = DEFAULT_FINAL_TEMPERATURE,
  } = input;

  const { nightBedOptions, nightWakeOptions, doseOptions } = candidates;

  // 축 순서: [밤별 취침 …, 밤별 기상 …, 카페인 …]. indices 배열도 이 순서와 1:1로 대응한다.
  const axes: Axis[] = [
    ...nightBedOptions.map((_, nightIndex): Axis => ({ kind: "bed", nightIndex })),
    ...nightWakeOptions.map((_, nightIndex): Axis => ({ kind: "wake", nightIndex })),
    ...doseOptions.map((_, doseIndex): Axis => ({ kind: "dose", doseIndex })),
  ];

  const lengthFor = (axis: Axis): number => {
    if (axis.kind === "bed") return nightBedOptions[axis.nightIndex].length;
    if (axis.kind === "wake") return nightWakeOptions[axis.nightIndex].length;
    return doseOptions[axis.doseIndex].length;
  };

  const numNights = nightBedOptions.length;
  const wakeAxisOffset = numNights; // indices에서 기상 축이 시작하는 위치
  const doseAxisOffset = 2 * numNights; // indices에서 카페인 축이 시작하는 위치

  const scheduleFromIndices = (indices: number[]) => ({
    nights: nightBedOptions.map((bedOptions, i) => ({
      bedTime: bedOptions[indices[i]],
      wakeTime: nightWakeOptions[i][indices[wakeAxisOffset + i]],
    })),
    doses: doseOptions.map((options, i) => options[indices[doseAxisOffset + i]]),
  });

  const scoreOf = (indices: number[]) =>
    scoreMultiDaySchedule({
      habitualBedTime,
      habitualWakeTime,
      schedule: scheduleFromIndices(indices),
      examTimes,
      bodyWeightKg,
      halfLifeHours,
      warmupDays,
      minSleepHours,
      fixedDoses,
    }).score;

  const coolingRatio = Math.pow(finalTemperature / initialTemperature, 1 / iterations);

  // 무작위 초기값에서 담금질(simulated annealing) 1회를 끝까지 돌려, 그동안 본 최고
  // 스케줄의 indices와 점수를 돌려준다.
  const annealOnce = (): { indices: number[]; score: number } => {
    let currentIndices = axes.map((axis) => randomIndex(lengthFor(axis)));
    let currentScore = scoreOf(currentIndices);

    let bestIndices = currentIndices;
    let bestScore = currentScore;

    let temperature = initialTemperature;

    for (let step = 0; step < iterations; step++) {
      const axisPosition = randomIndex(axes.length);

      const neighborIndices = [...currentIndices];
      neighborIndices[axisPosition] = neighborIndex(currentIndices[axisPosition], lengthFor(axes[axisPosition]));

      const neighborScore = scoreOf(neighborIndices);
      const delta = neighborScore - currentScore;
      const accept = delta >= 0 || Math.random() < Math.exp(delta / temperature);

      if (accept) {
        currentIndices = neighborIndices;
        currentScore = neighborScore;

        if (currentScore > bestScore) {
          bestScore = currentScore;
          bestIndices = currentIndices;
        }
      }

      temperature *= coolingRatio;
    }

    return { indices: bestIndices, score: bestScore };
  };

  // #23 — 재시작 여러 번 중 최고를 채택해 국소 최적점에 빠진 실행의 영향을 지운다.
  let overallBest = annealOnce();
  for (let restart = 1; restart < restarts; restart++) {
    const candidate = annealOnce();
    if (candidate.score > overallBest.score) overallBest = candidate;
  }

  const best = scheduleFromIndices(overallBest.indices);
  return { nights: best.nights, doses: best.doses, score: overallBest.score };
}
