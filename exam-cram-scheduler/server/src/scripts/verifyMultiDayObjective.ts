// #11 "다중 시험 최적화 — 목적함수 구현" 검증용.
// 1) 시험 1개일 때 #8(buildCandidateSegments)과 같은 점수가 나오는지 회귀 검증
// 2) 시험 여러 개일 때 examScores와 최솟값(score)이 올바르게 나오는지 확인
import { alertness } from "../calc/alertness.js";
import { buildCandidateSegments, segmentAt } from "../calc/candidateSleepSegments.js";
import { scoreMultiDaySchedule } from "../calc/multiDayObjective.js";
import { sensitivityToHalfLife } from "../calc/sensitivityToHalfLife.js";

const HABITUAL_BED_TIME = 23;
const HABITUAL_WAKE_TIME = 7;
const BODY_WEIGHT_KG = 65;
const HALF_LIFE_HOURS = sensitivityToHalfLife("보통");

console.log("=== 1) 회귀 검증: 시험 1개, #8 방식 vs #11 방식 ===");

// #8 방식(buildCandidateSegments) — 이전 verifySingleExamSchedule.ts와 동일한 시나리오
const EXAM_TIME_RAW = 9;
const DOSE_RAW = { time: 8, amountMg: 200 };

const oldSegments = buildCandidateSegments(HABITUAL_BED_TIME, HABITUAL_WAKE_TIME, HABITUAL_BED_TIME, HABITUAL_WAKE_TIME);
const oldSegmentAtExam = segmentAt(oldSegments, EXAM_TIME_RAW);
const oldScore = alertness(EXAM_TIME_RAW, oldSegmentAtExam, [DOSE_RAW], BODY_WEIGHT_KG, HALF_LIFE_HOURS);

// #11 방식(buildMultiNightSegments, N=1) — night[0]은 24를 더한 좌표계를 쓰므로
// 같은 시나리오를 표현하려면 examTime·dose.time도 전부 +24 해서 넘겨야 한다
// (일주기리듬 C(t)는 24시간 주기라 +24만큼 이동해도 값이 똑같이 나온다).
const SHIFT = 24;
const newResult = scoreMultiDaySchedule({
  habitualBedTime: HABITUAL_BED_TIME,
  habitualWakeTime: HABITUAL_WAKE_TIME,
  schedule: {
    nights: [{ bedTime: HABITUAL_BED_TIME, wakeTime: HABITUAL_WAKE_TIME + SHIFT }],
    doses: [{ time: DOSE_RAW.time + SHIFT, amountMg: DOSE_RAW.amountMg }],
  },
  examTimes: [EXAM_TIME_RAW + SHIFT],
  bodyWeightKg: BODY_WEIGHT_KG,
  halfLifeHours: HALF_LIFE_HOURS,
});

console.log("#8 방식 점수:", oldScore.toFixed(6));
console.log("#11 방식 점수:", newResult.examScores[0].score.toFixed(6));
console.log(
  Math.abs(oldScore - newResult.examScores[0].score) < 1e-6
    ? "[OK] 두 방식의 점수가 일치함"
    : "[FAIL] 두 방식의 점수가 다름 — buildMultiNightSegments 버그 의심",
);

console.log("\n=== 2) 시험 여러 개 — examScores와 최솟값(score) 확인 ===");

// 3일짜리 시험기간: 매일 23시 취침·7시 기상 그대로(오프셋 0), 매일 아침 8시에 200mg
const nights = [0, 1, 2].map((i) => ({
  bedTime: HABITUAL_BED_TIME + 24 * i,
  wakeTime: HABITUAL_WAKE_TIME + 24 * (i + 1),
}));
const doses = [0, 1, 2].map((i) => ({ time: 8 + 24 * i, amountMg: 200 }));

// 시험 시각을 일부러 다르게: 1번째 시험은 여유 있는 09:00, 2번째 시험은 기상 직후인
// 07:10(각성도가 아직 낮을 시각)이라 다른 시험보다 점수가 낮게 나와야 함
const examTimes = [9 + 24 * 0, 7.1667 + 24 * 1, 9 + 24 * 2];

const multiExamResult = scoreMultiDaySchedule({
  habitualBedTime: HABITUAL_BED_TIME,
  habitualWakeTime: HABITUAL_WAKE_TIME,
  schedule: { nights, doses },
  examTimes,
  bodyWeightKg: BODY_WEIGHT_KG,
  halfLifeHours: HALF_LIFE_HOURS,
});

console.log(
  "시험별 점수:",
  multiExamResult.examScores.map((exam, i) => `exam[${i}]=${exam.score.toFixed(4)}`),
);
console.log("최솟값(score):", multiExamResult.score.toFixed(4));

const manualMin = Math.min(...multiExamResult.examScores.map((exam) => exam.score));
console.log(
  Math.abs(manualMin - multiExamResult.score) < 1e-9 && multiExamResult.examScores[1].score === multiExamResult.score
    ? "[OK] 가장 컨디션 나쁜(기상 직후) 시험이 최솟값으로 정확히 뽑힘"
    : "[FAIL] 최솟값 계산이 예상과 다름",
);
