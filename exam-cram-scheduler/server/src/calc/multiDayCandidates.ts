// 3주차 월요일 "다중 시험 최적화 — 그리드 결정변수 정의"(#10)
// singleExamScheduleSearch.ts(2주차, 시험 1개용)의 취침·기상·카페인 후보 그리드를
// 시험기간 전체(여러 밤)로 확장한다. 그리드 간격은 2주차와 동일하게 15분, ±1시간으로
// 유지하기로 했다(2026-07-20 결정, 이슈 본문의 "30분"에서 변경).
//
// 최소 수면시간처럼 "이 조합이 얼마나 안 좋은지" 판단이 필요한 제약은 여기서 걸러내지
// 않는다 — #11(목적함수)에서 패널티로 처리하기로 했다(2026-07-20 결정). 이 파일이
// 거르는 건 카페인을 기상 전에 마시는 것처럼, 또는 시험 시작 뒤에 깨는 것처럼 애초에
// 말이 안 되는 조합뿐이다(#22 — 시험이 평소 기상 시각과 가까우면 기상 후보 그리드가
// 시험 시각을 넘어갈 수 있어서, "아직 자고 있는데 시험 시작"인 후보가 만들어지던 버그).
//
// 밤 4개만 있어도 후보 조합이 81^4개로 폭발하기 때문에, 여기서는 전체 조합(cartesian
// product)을 만들지 않는다. 대신 "밤별 취침 후보", "밤별 기상 후보", "카페인별 섭취 시각
// 후보"를 축(axis) 단위로만 반환하고, #12(로컬 탐색)가 필요할 때마다 축 하나씩 골라
// 쓰는 방식으로 쓰인다.
//
// #23 — 취침과 기상을 별개의 축으로 분리했다. 예전엔 밤 하나를 "취침×기상 81개"를 이어붙인
// 1차원 목록으로 반환했는데, 그러면 로컬 탐색의 ±1 이웃 이동이 사실상 기상 시각만 흔들고
// 취침 시각은 무작위 초기값에 고정돼버리는 문제가 있었다. 취침·기상은 원래 서로 독립적인
// 결정변수이므로 각각 축으로 두는 게 맞다.
import type { CaffeineDose } from "./caffeineConcentration.js";

const GRID_RANGE_HOURS = 1; // singleExamScheduleSearch.ts와 동일한 범위
const GRID_STEP_HOURS = 0.25; // 15분 간격 (2026-07-20: 2주차와 동일하게 유지 결정)

function candidateOffsets(): number[] {
  const offsets: number[] = [];
  for (let offset = -GRID_RANGE_HOURS; offset <= GRID_RANGE_HOURS + 1e-9; offset += GRID_STEP_HOURS) {
    offsets.push(Math.round(offset * 100) / 100);
  }
  return offsets;
}

export interface NightCandidate {
  bedTime: number;
  wakeTime: number;
}

/**
 * 밤 하나의 취침 시각 후보 목록(최대 9개)을 만든다. habitualBedTime은 그 밤의
 * "원래(평소 또는 시험기간 계획) 취침 시각"을 연속 타임라인 좌표(자정 기준 경과 시간에
 * 24h × 며칠째인지를 더한 값)로 넣는다 — candidateSleepSegments.ts가 쓰는 좌표계와 동일.
 */
export function bedTimeCandidates(habitualBedTime: number): number[] {
  return candidateOffsets().map((offset) => habitualBedTime + offset);
}

/**
 * 밤 하나의 기상 시각 후보 목록(최대 9개)을 만든다. 좌표계는 bedTimeCandidates와 동일.
 *
 * latestWakeTime을 주면(#22) 그보다 늦게 깨는 후보는 제외한다 — 이 밤 바로 다음날
 * 시험이 있을 때, "시험 시작 후에 깨는" 말이 안 되는 후보를 막기 위함. 제약을 만족하는
 * 후보가 하나도 안 남으면(시험이 그리드 범위보다 훨씬 이른 경우) 크래시 대신 그리드
 * 전체로 폴백한다 — #12에서 겪었던 "후보가 0개라 탐색이 터지는" 문제 재발 방지.
 */
export function wakeTimeCandidates(habitualWakeTime: number, latestWakeTime?: number): number[] {
  const all = candidateOffsets().map((offset) => habitualWakeTime + offset);
  if (latestWakeTime === undefined) return all;

  const withinDeadline = all.filter((wakeTime) => wakeTime <= latestWakeTime);
  return withinDeadline.length > 0 ? withinDeadline : all;
}

/**
 * 카페인 1회 섭취에 대한 섭취 시각 후보를 만든다. earliestTime보다 이른 후보(기상 전
 * 섭취 등 말이 안 되는 조합)는 제외한다 — singleExamScheduleSearch.ts와 동일한 규칙.
 * earliestTime은 호출하는 쪽에서, 이 카페인이 속한 날의 기상 시각으로 넘겨준다.
 */
export function doseTimeCandidates(dose: CaffeineDose, earliestTime: number): CaffeineDose[] {
  return candidateOffsets()
    .map((offset) => ({ time: dose.time + offset, amountMg: dose.amountMg }))
    .filter((candidate) => candidate.time >= earliestTime);
}

export interface MultiDayCandidateInput {
  /** 시험기간에 포함되는 밤들의 원래 취침·기상 시각(연속 타임라인 좌표), 날짜 순서대로 */
  nights: { habitualBedTime: number; habitualWakeTime: number; latestWakeTime?: number }[];
  /**
   * 원래 계획된 카페인 섭취(시각+용량+속한 밤의 기상 시각) 목록.
   * dose.amountMg는 amountOptionsMg를 안 넘겼을 때 쓰는 고정값이다.
   */
  plannedDoses: { dose: CaffeineDose; earliestTime: number }[];
  /**
   * 섭취량 후보(mg). 넘기면 용량도 탐색 대상이 된다(#3, 2026-07-22 결정 —
   * 잔 수 단위로 고르게 하기 위해 도입). 안 넘기면 기존처럼 dose.amountMg 고정.
   */
  amountOptionsMg?: number[];
}

export interface MultiDayCandidates {
  /** nightBedOptions[i] = nights[i]에 대응하는 취침 시각 후보 목록 */
  nightBedOptions: number[][];
  /** nightWakeOptions[i] = nights[i]에 대응하는 기상 시각 후보 목록 */
  nightWakeOptions: number[][];
  /** doseOptions[j] = plannedDoses[j]에 대응하는 섭취 시각 후보 목록 */
  doseOptions: CaffeineDose[][];
  /**
   * doseAmountOptions[j] = plannedDoses[j]에 대응하는 섭취량(mg) 후보 목록.
   * 시각과 같은 목록에 섞지 않고 별도 축으로 둔다 — #23에서 취침×기상을 한 목록으로
   * 이어붙였다가 로컬 탐색의 ±1 이동이 한쪽 축만 흔드는 문제를 겪었기 때문.
   */
  doseAmountOptions: number[][];
}

/** 시험기간 전체에 걸친 취침/기상/카페인 후보 축(axis)들을 만든다. */
export function buildMultiDayCandidates({
  nights,
  plannedDoses,
  amountOptionsMg,
}: MultiDayCandidateInput): MultiDayCandidates {
  const nightBedOptions = nights.map((night) => bedTimeCandidates(night.habitualBedTime));
  const nightWakeOptions = nights.map((night) => wakeTimeCandidates(night.habitualWakeTime, night.latestWakeTime));

  const doseOptions = plannedDoses.map(({ dose, earliestTime }) => doseTimeCandidates(dose, earliestTime));
  const doseAmountOptions = plannedDoses.map(({ dose }) =>
    amountOptionsMg && amountOptionsMg.length > 0 ? amountOptionsMg : [dose.amountMg],
  );

  return { nightBedOptions, nightWakeOptions, doseOptions, doseAmountOptions };
}
