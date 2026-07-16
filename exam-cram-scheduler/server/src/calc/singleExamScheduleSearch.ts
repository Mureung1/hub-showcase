// 2주차 목요일 "목표 각성 시각 역산"(4.1) — 2주차_계획.md 3.2 "패널티·가중치 없는 단순 탐색"
// 취침·기상·카페인 섭취 시각 후보를 평소/원래 계획 시각 기준 그리드로 만들어서,
// 시험 시작 시각의 P(t)를 가장 높이는 조합을 고른다.
// 여유시간(기상 후 준비 시간 등)은 계산에 넣지 않는다 — 화장실·이동 같은 준비 시간은
// 사람마다 편차가 커서 계산에 일반화해 넣기보다 정보 입력 화면의 안내 문구로 대체하기로
// 했다(2026-07-16 결정, 기획서.md 6.4 갱신). 목표는 그냥 "시험 시작 시각에 각성도가 최고"다.
// 3주차 다중 시험 최적화가 이 채점(alertness) 방식을 그대로 재사용할 예정.
import { alertness } from "./alertness.js";
import { buildCandidateSegments, segmentAt, WARMUP_DAYS } from "./candidateSleepSegments.js";
import type { CaffeineDose } from "./caffeineConcentration.js";

const GRID_RANGE_HOURS = 1; // 후보 탐색 범위: 평소/원래 시각 기준 ±1시간(2026-07-16 결정)
const GRID_STEP_HOURS = 0.25; // 후보 간격 15분(2026-07-16 결정)

function candidateOffsets(): number[] {
  const offsets: number[] = [];
  for (let offset = -GRID_RANGE_HOURS; offset <= GRID_RANGE_HOURS + 1e-9; offset += GRID_STEP_HOURS) {
    offsets.push(Math.round(offset * 100) / 100);
  }
  return offsets;
}

function cartesianProduct<T>(lists: T[][]): T[][] {
  return lists.reduce<T[][]>((acc, list) => acc.flatMap((combo) => list.map((item) => [...combo, item])), [[]]);
}

export interface SingleExamScheduleInput {
  habitualBedTime: number;
  habitualWakeTime: number;
  /** 원래 계획한 카페인 섭취(시각+용량). 용량은 고정하고 섭취 시각만 후보로 흔든다(2026-07-16 결정) */
  plannedDoses: CaffeineDose[];
  examStartTime: number;
  bodyWeightKg: number;
  halfLifeHours: number;
  warmupDays?: number;
}

export interface SingleExamScheduleResult {
  bedTime: number;
  wakeTime: number;
  doses: CaffeineDose[];
  examStartTime: number;
  score: number;
}

export function findBestSingleExamSchedule(input: SingleExamScheduleInput): SingleExamScheduleResult {
  const {
    habitualBedTime,
    habitualWakeTime,
    plannedDoses,
    examStartTime,
    bodyWeightKg,
    halfLifeHours,
    warmupDays = WARMUP_DAYS,
  } = input;

  const offsets = candidateOffsets();

  let best: SingleExamScheduleResult | null = null;

  for (const bedOffset of offsets) {
    const bedTime = habitualBedTime + bedOffset;

    for (const wakeOffset of offsets) {
      const wakeTime = habitualWakeTime + wakeOffset;

      const segments = buildCandidateSegments(habitualBedTime, habitualWakeTime, bedTime, wakeTime, warmupDays);
      const segmentAtExam = segmentAt(segments, examStartTime);

      const doseCandidateLists = plannedDoses.map((dose) =>
        offsets
          .map((doseOffset) => ({ time: dose.time + doseOffset, amountMg: dose.amountMg }))
          .filter((candidate) => candidate.time >= wakeTime), // 기상 전 섭취 후보는 제외(2026-07-16 결정)
      );

      for (const doses of cartesianProduct(doseCandidateLists)) {
        const score = alertness(examStartTime, segmentAtExam, doses, bodyWeightKg, halfLifeHours);

        if (!best || score > best.score) {
          best = { bedTime, wakeTime, doses, examStartTime, score };
        }
      }
    }
  }

  if (!best) {
    throw new Error(
      "유효한 취침·기상·카페인 후보 조합을 찾지 못했습니다 — 카페인 섭취 시각이 기상 시각보다 너무 이른지 확인하세요.",
    );
  }

  return best;
}
