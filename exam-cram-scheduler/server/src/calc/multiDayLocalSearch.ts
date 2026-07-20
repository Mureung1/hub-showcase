// 3주차 월요일 "다중 시험 최적화 — 로컬 탐색 휴리스틱 구현"(#12)
// #10(multiDayCandidates.ts)이 만든 축과 #11(multiDayObjective.ts)의 채점 함수를 이용해,
// 전체 조합을 다 뒤지지 않고 simulated annealing류 로컬 탐색으로 근사 최적 스케줄을 찾는다.
//
// 각 "밤"과 각 "카페인"을 축 하나로 보고, 매 반복마다 축 하나를 무작위로 골라 그 축
// 안에서 인접한 값으로 옮겨본 뒤(이웃), #11로 채점해서 더 좋으면 이동하고 나쁘더라도
// 온도에 따른 확률로 가끔 이동한다. 온도는 반복이 진행될수록 기하급수적으로 낮아져서,
// 후반부에는 사실상 "더 좋은 이웃으로만 이동"하는 상태로 수렴한다.
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
  iterations?: number;
  initialTemperature?: number;
  finalTemperature?: number;
}

export interface LocalSearchResult {
  nights: NightCandidate[];
  doses: CaffeineDose[];
  score: number;
}

const DEFAULT_ITERATIONS = 400;
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

type Axis = { kind: "night"; axisIndex: number } | { kind: "dose"; axisIndex: number };

export function searchMultiDaySchedule(input: LocalSearchInput): LocalSearchResult {
  const {
    habitualBedTime,
    habitualWakeTime,
    candidates,
    examTimes,
    bodyWeightKg,
    halfLifeHours,
    warmupDays,
    iterations = DEFAULT_ITERATIONS,
    initialTemperature = DEFAULT_INITIAL_TEMPERATURE,
    finalTemperature = DEFAULT_FINAL_TEMPERATURE,
  } = input;

  const { nightOptions, doseOptions } = candidates;

  const axes: Axis[] = [
    ...nightOptions.map((_, axisIndex): Axis => ({ kind: "night", axisIndex })),
    ...doseOptions.map((_, axisIndex): Axis => ({ kind: "dose", axisIndex })),
  ];

  const optionsFor = (axis: Axis) => (axis.kind === "night" ? nightOptions[axis.axisIndex] : doseOptions[axis.axisIndex]);

  const scheduleFromIndices = (indices: number[]) => ({
    nights: nightOptions.map((options, i) => options[indices[i]]),
    doses: doseOptions.map((options, i) => options[indices[nightOptions.length + i]]),
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
    }).score;

  let currentIndices = axes.map((axis) => randomIndex(optionsFor(axis).length));
  let currentScore = scoreOf(currentIndices);

  let bestIndices = currentIndices;
  let bestScore = currentScore;

  const coolingRatio = Math.pow(finalTemperature / initialTemperature, 1 / iterations);
  let temperature = initialTemperature;

  for (let step = 0; step < iterations; step++) {
    const axisPosition = randomIndex(axes.length);
    const options = optionsFor(axes[axisPosition]);

    const neighborIndices = [...currentIndices];
    neighborIndices[axisPosition] = neighborIndex(currentIndices[axisPosition], options.length);

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

  const best = scheduleFromIndices(bestIndices);
  return { nights: best.nights, doses: best.doses, score: bestScore };
}
