// #21 "다중 시험 최적화 — 목적함수에 최소 수면시간 패널티 반영" 검증용.
import { buildMultiDayCandidates } from "../calc/multiDayCandidates.js";
import { scoreMultiDaySchedule } from "../calc/multiDayObjective.js";
import { searchMultiDaySchedule } from "../calc/multiDayLocalSearch.js";
import type { NightCandidate } from "../calc/multiDayCandidates.js";
import { sensitivityToHalfLife } from "../calc/sensitivityToHalfLife.js";

const BODY_WEIGHT_KG = 65;
const HALF_LIFE_HOURS = sensitivityToHalfLife("보통");

function sleptHours(nights: NightCandidate[]): number {
  return nights.reduce((sum, n) => sum + (n.wakeTime - n.bedTime), 0);
}

console.log("=== 1) 회귀 확인: minSleepHours를 안 주거나 0으로 주면 기존과 동일한 점수 ===");
// verifyMultiDaySchedule.ts(#13)와 동일한 3일 시나리오, 평소 스케줄 그대로 채점.
const HABITUAL_BED_TIME = 23;
const HABITUAL_WAKE_TIME = 7;
const EXAM_DAYS = 3;
const habitualNights = Array.from({ length: EXAM_DAYS }, (_, k) => ({
  bedTime: HABITUAL_BED_TIME + 24 * k,
  wakeTime: HABITUAL_WAKE_TIME + 24 * (k + 1),
}));
const habitualDoses = Array.from({ length: EXAM_DAYS }, (_, k) => ({ time: 8 + 24 * (k + 1), amountMg: 200 }));
const habitualExamTimes = [9 + 24 * 1, 7.1667 + 24 * 2, 9 + 24 * 3];

const withoutMinSleep = scoreMultiDaySchedule({
  habitualBedTime: HABITUAL_BED_TIME,
  habitualWakeTime: HABITUAL_WAKE_TIME,
  schedule: { nights: habitualNights, doses: habitualDoses },
  examTimes: habitualExamTimes,
  bodyWeightKg: BODY_WEIGHT_KG,
  halfLifeHours: HALF_LIFE_HOURS,
});
const withZeroMinSleep = scoreMultiDaySchedule({
  habitualBedTime: HABITUAL_BED_TIME,
  habitualWakeTime: HABITUAL_WAKE_TIME,
  schedule: { nights: habitualNights, doses: habitualDoses },
  examTimes: habitualExamTimes,
  bodyWeightKg: BODY_WEIGHT_KG,
  halfLifeHours: HALF_LIFE_HOURS,
  minSleepHours: 0,
});
console.log("minSleepHours 안 줬을 때 점수:", withoutMinSleep.score.toFixed(4));
console.log("minSleepHours=0으로 줬을 때 점수:", withZeroMinSleep.score.toFixed(4));
console.log(
  Math.abs(withoutMinSleep.score - withZeroMinSleep.score) < 1e-9
    ? "[OK] 두 결과가 동일 — 패널티가 걸리지 않을 땐 기존 동작과 같음"
    : "[FAIL] 패널티 로직이 기존 동작을 바꿔버림",
);

console.log("\n=== 2) 타이트한 최소 수면시간이 실제로 탐색 결과를 바꾸는지 ===");
// 평소 수면시간이 4시간뿐인 빡빡한 시나리오 + 시험이 기상 시각대 근처라, 취침을 늦추고
// 기상을 당겨서(=수면시간을 더 줄여서) 수면관성을 피하는 쪽이 유리해질 수 있는 상황을 만든다.
const TIGHT_BED = 2; // 새벽 2시
const TIGHT_WAKE = 6; // 오전 6시 (평소 수면 4시간)
const tightNights = [{ habitualBedTime: TIGHT_BED, habitualWakeTime: TIGHT_WAKE }];
const tightDoses = [{ dose: { time: TIGHT_WAKE + 0.5, amountMg: 200 }, earliestTime: TIGHT_WAKE }];
const tightExamTimes = [8]; // 그리드 상 가장 늦은 기상 후보(7시)보다 늦은 시각이라 항상 "깨어있는" 구간

const tightCandidates = buildMultiDayCandidates({ nights: tightNights, plannedDoses: tightDoses });

const searchInput = {
  habitualBedTime: TIGHT_BED,
  habitualWakeTime: TIGHT_WAKE,
  candidates: tightCandidates,
  examTimes: tightExamTimes,
  bodyWeightKg: BODY_WEIGHT_KG,
  halfLifeHours: HALF_LIFE_HOURS,
};

const unconstrained = searchMultiDaySchedule(searchInput);
const constrained = searchMultiDaySchedule({ ...searchInput, minSleepHours: 5 });

console.log(
  "제약 없을 때 — 수면시간:",
  sleptHours(unconstrained.nights).toFixed(2),
  "h / 점수:",
  unconstrained.score.toFixed(4),
);
console.log(
  "최소 5시간 제약 — 수면시간:",
  sleptHours(constrained.nights).toFixed(2),
  "h / 점수:",
  constrained.score.toFixed(4),
);
console.log(
  sleptHours(constrained.nights) >= 5 - 1e-9
    ? "[OK] 제약을 걸면 실제로 최소 수면시간을 지키는 스케줄을 찾음"
    : "[FAIL] 제약을 걸어도 여전히 수면시간이 부족함 — 패널티 크기가 너무 작을 수 있음(SLEEP_SHORTFALL_PENALTY_PER_HOUR 조정 필요)",
);
