// 2주차 목요일 "목표 각성 시각 역산" 검증용 — 평소 스케줄 그대로 쓴 점수와
// 그리드 탐색으로 찾은 최적 스케줄의 점수를 비교해서, 탐색이 실제로 더 나은(또는 최소한 같은) 조합을
// 찾는지 눈으로 확인한다. 목표 시각은 여유시간을 빼지 않은 시험 시작 시각 그대로 쓴다(2026-07-16 결정).
import { alertness } from "../calc/alertness.js";
import { buildCandidateSegments, segmentAt } from "../calc/candidateSleepSegments.js";
import { sensitivityToHalfLife } from "../calc/sensitivityToHalfLife.js";
import { findBestSingleExamSchedule } from "../calc/singleExamScheduleSearch.js";

const HABITUAL_BED_TIME = 23;
const HABITUAL_WAKE_TIME = 7;
const BODY_WEIGHT_KG = 65;
const HALF_LIFE_HOURS = sensitivityToHalfLife("보통");
const EXAM_START_TIME = 9; // 09:00 시험
const PLANNED_DOSES = [{ time: 8, amountMg: 200 }]; // 08:00 커피 200mg

// 평소 스케줄(오프셋 0) 그대로 썼을 때의 점수
const habitualSegments = buildCandidateSegments(
  HABITUAL_BED_TIME,
  HABITUAL_WAKE_TIME,
  HABITUAL_BED_TIME,
  HABITUAL_WAKE_TIME,
);
const habitualSegmentAtExam = segmentAt(habitualSegments, EXAM_START_TIME);
const habitualScore = alertness(EXAM_START_TIME, habitualSegmentAtExam, PLANNED_DOSES, BODY_WEIGHT_KG, HALF_LIFE_HOURS);

const best = findBestSingleExamSchedule({
  habitualBedTime: HABITUAL_BED_TIME,
  habitualWakeTime: HABITUAL_WAKE_TIME,
  plannedDoses: PLANNED_DOSES,
  examStartTime: EXAM_START_TIME,
  bodyWeightKg: BODY_WEIGHT_KG,
  halfLifeHours: HALF_LIFE_HOURS,
});

console.log("시험 시작 시각(목표):", EXAM_START_TIME.toFixed(2));
console.log("평소 스케줄 그대로 점수(habitual score):", habitualScore.toFixed(4));
console.log("탐색으로 찾은 최적 스케줄:", {
  bedTime: best.bedTime,
  wakeTime: best.wakeTime,
  doses: best.doses,
  score: Number(best.score.toFixed(4)),
});
console.log(
  best.score >= habitualScore
    ? "[OK] 탐색 결과가 평소 스케줄보다 같거나 높음"
    : "[FAIL] 탐색 결과가 평소 스케줄보다 낮음 — 버그 의심",
);
