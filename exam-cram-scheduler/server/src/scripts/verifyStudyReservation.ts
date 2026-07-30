// ② "남은 공부량 반영"(2026-07-30) 검증용.
// (1) enforceStudyTime을 끄면(기본) 공부량을 줘도 점수가 안 바뀌는지(회귀),
// (2) 켜면 실제로 탐색이 "덜 자고 더 깨어있는"(=공부 시간을 확보하는) 스케줄을 고르는지 확인한다.
import { buildMultiDayCandidates } from "../calc/multiDayCandidates.js";
import { scoreMultiDaySchedule } from "../calc/multiDayObjective.js";
import { searchMultiDaySchedule } from "../calc/multiDayLocalSearch.js";
import { buildMultiNightSegments } from "../calc/candidateSleepSegments.js";
import { computeStudyShortfall, type ExamStudyNeed } from "../calc/studyReservation.js";
import type { NightCandidate } from "../calc/multiDayCandidates.js";
import { sensitivityToHalfLife } from "../calc/sensitivityToHalfLife.js";

const BODY_WEIGHT_KG = 65;
const HALF_LIFE_HOURS = sensitivityToHalfLife("보통");

function sleptHours(nights: NightCandidate[]): number {
  return nights.reduce((sum, n) => sum + (n.wakeTime - n.bedTime), 0);
}

/** 시험 전(0시부터 examTime까지) 깨어있는 시간을, 목적함수가 쓰는 것과 같은 로직으로 잰다. */
function availableStudyHours(
  habitualBedTime: number,
  habitualWakeTime: number,
  nights: NightCandidate[],
  examTime: number,
): number {
  const segments = buildMultiNightSegments(habitualBedTime, habitualWakeTime, nights);
  return computeStudyShortfall(segments, [{ examTime, requiredHours: 0 }], 0).byExam[0].availableHours;
}

console.log("=== 1) 회귀 확인: enforceStudyTime을 끄면 공부량을 줘도 점수가 안 바뀐다 ===");
const HABITUAL_BED_TIME = 23;
const HABITUAL_WAKE_TIME = 7;
const EXAM_DAYS = 3;
const habitualNights = Array.from({ length: EXAM_DAYS }, (_, k) => ({
  bedTime: HABITUAL_BED_TIME + 24 * k,
  wakeTime: HABITUAL_WAKE_TIME + 24 * (k + 1),
}));
const habitualDoses = Array.from({ length: EXAM_DAYS }, (_, k) => ({ time: 8 + 24 * (k + 1), amountMg: 200 }));
const habitualExamTimes = [9 + 24 * 1, 7.1667 + 24 * 2, 9 + 24 * 3];
const habitualStudyNeeds: ExamStudyNeed[] = habitualExamTimes.map((examTime) => ({ examTime, requiredHours: 30 }));

const baseInput = {
  habitualBedTime: HABITUAL_BED_TIME,
  habitualWakeTime: HABITUAL_WAKE_TIME,
  schedule: { nights: habitualNights, doses: habitualDoses },
  examTimes: habitualExamTimes,
  bodyWeightKg: BODY_WEIGHT_KG,
  halfLifeHours: HALF_LIFE_HOURS,
};

const withoutStudy = scoreMultiDaySchedule(baseInput);
const withStudyNotEnforced = scoreMultiDaySchedule({
  ...baseInput,
  studyNeeds: habitualStudyNeeds,
  studyWindowStart: 0,
  enforceStudyTime: false,
});
console.log("공부량 안 줬을 때 점수:", withoutStudy.score.toFixed(4));
console.log("공부량 줬지만 enforce=false 점수:", withStudyNotEnforced.score.toFixed(4));
console.log("계산된 공부 부족(시간):", withStudyNotEnforced.studyShortfallHours.toFixed(2));
console.log(
  Math.abs(withoutStudy.score - withStudyNotEnforced.score) < 1e-9
    ? "[OK] 점수 동일 — 부족분은 계산하되(경고용) 점수엔 반영 안 함"
    : "[FAIL] enforce=false인데 점수가 바뀜",
);

console.log("\n=== 2) enforce=true면 실제로 잠을 줄여 공부 시간을 확보한다 ===");
// 밤 좌표는 실제 라우트와 같은 연속 좌표(취침 23시, 기상은 다음날 7시 → 31)로 준다.
// 시험은 내일 아침 07:10(=31.1667). 남은 공부량을 그리드로 확보 가능한 최대(~25h)보다
// 크게 잡아, "덜 잘수록 공부 시간이 늘어나는" 방향의 기울기가 계속 살아있게 한다.
// latestWakeTime을 시험 시각으로 줘서(#22) "시험 뒤에 깨는" 후보는 라우트처럼 걸러낸다.
// 평소 시각은 "일간 시각"(취침 23시, 기상 07시)으로, 밤 후보 좌표는 "연속 좌표"(다음날
// 기상은 7+24=31)로 둔다 — 이 둘을 섞으면 수면압 구간이 어긋난다(2026-07-30 디버깅에서 확인).
const HABITUAL_BED = 23;
const HABITUAL_WAKE = 7;
const NIGHT_BED = 23; // 연속 좌표(오늘 밤 23시)
const NIGHT_WAKE = 31; // 연속 좌표(다음날 07시)
const EXAM_TIME = 7.1667 + 24; // 내일 07:10
const REQUIRED_STUDY = 30; // 확보 가능 최대(~25h)보다 크게 → 항상 "덜 자라" 방향
const tightNights = [{ habitualBedTime: NIGHT_BED, habitualWakeTime: NIGHT_WAKE, latestWakeTime: EXAM_TIME }];
const tightDoses = [{ dose: { time: NIGHT_WAKE + 0.5, amountMg: 200 }, earliestTime: NIGHT_WAKE }];
const tightCandidates = buildMultiDayCandidates({ nights: tightNights, plannedDoses: tightDoses });

const searchInput = {
  habitualBedTime: HABITUAL_BED,
  habitualWakeTime: HABITUAL_WAKE,
  candidates: tightCandidates,
  examTimes: [EXAM_TIME],
  bodyWeightKg: BODY_WEIGHT_KG,
  halfLifeHours: HALF_LIFE_HOURS,
  studyNeeds: [{ examTime: EXAM_TIME, requiredHours: REQUIRED_STUDY }] as ExamStudyNeed[],
  studyWindowStart: 0,
};

const TRIALS = 30;
let successes = 0;
let sumAwakeOff = 0;
let sumAwakeOn = 0;
for (let trial = 0; trial < TRIALS; trial++) {
  const off = searchMultiDaySchedule({ ...searchInput, enforceStudyTime: false });
  const on = searchMultiDaySchedule({ ...searchInput, enforceStudyTime: true });
  const awakeOff = availableStudyHours(HABITUAL_BED, HABITUAL_WAKE, off.nights, EXAM_TIME);
  const awakeOn = availableStudyHours(HABITUAL_BED, HABITUAL_WAKE, on.nights, EXAM_TIME);
  sumAwakeOff += awakeOff;
  sumAwakeOn += awakeOn;
  // enforce하면 잠이 줄어(=깨어있는 공부 시간이 늘어)야 한다. 의미 있는 차이(0.1h 이상)만 성공으로 센다.
  if (awakeOn > awakeOff + 0.1) {
    successes++;
  }
}
const successRate = successes / TRIALS;
console.log(`평균 확보 공부시간 — enforce off: ${(sumAwakeOff / TRIALS).toFixed(2)}h / on: ${(sumAwakeOn / TRIALS).toFixed(2)}h`);
console.log(`잠 줄여 공부 확보 성공 ${successes}/${TRIALS}회 (${(successRate * 100).toFixed(1)}%)`);
console.log(
  successRate >= 0.95
    ? "[OK] enforce=true면 안정적으로(95%+) 덜 자고 공부 시간을 더 확보함"
    : "[FAIL] 성공률이 낮음 — 공부 패널티가 약하거나 탐색이 취침/기상을 못 흔듦",
);
