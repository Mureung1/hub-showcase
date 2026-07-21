// #13 "다중 시험 최적화 — 검증 스크립트" 검증용.
// verifyAlertnessCurve.ts와 같은 패턴으로, #12(로컬 탐색)가 찾은 추천 스케줄과
// 각 시험 시각의 P(t)를 CSV로 뽑아 눈으로 확인한다.
// 시나리오는 verifyMultiDaySearch.ts(#12)와 동일한 3일짜리 시험기간을 그대로 쓴다.
import { writeFileSync } from "node:fs";
import { buildMultiDayCandidates } from "../calc/multiDayCandidates.js";
import { scoreMultiDaySchedule } from "../calc/multiDayObjective.js";
import { searchMultiDaySchedule } from "../calc/multiDayLocalSearch.js";
import { sensitivityToHalfLife } from "../calc/sensitivityToHalfLife.js";

const HABITUAL_BED_TIME = 23;
const HABITUAL_WAKE_TIME = 7;
const BODY_WEIGHT_KG = 65;
const HALF_LIFE_HOURS = sensitivityToHalfLife("보통");

const EXAM_DAYS = 3;
const nights = Array.from({ length: EXAM_DAYS }, (_, k) => ({
  habitualBedTime: HABITUAL_BED_TIME + 24 * k,
  habitualWakeTime: HABITUAL_WAKE_TIME + 24 * (k + 1),
}));
const plannedDoses = Array.from({ length: EXAM_DAYS }, (_, k) => ({
  dose: { time: 8 + 24 * (k + 1), amountMg: 200 },
  earliestTime: HABITUAL_WAKE_TIME + 24 * (k + 1), // night[k]의 기상 시각과 동일
}));

// 시험 시각: day1 09:00(여유), day2 07:10(기상 직후, 힘든 시각), day3 09:00
const examTimes = [9 + 24 * 1, 7.1667 + 24 * 2, 9 + 24 * 3];

const candidates = buildMultiDayCandidates({ nights, plannedDoses });

const best = searchMultiDaySchedule({
  habitualBedTime: HABITUAL_BED_TIME,
  habitualWakeTime: HABITUAL_WAKE_TIME,
  candidates,
  examTimes,
  bodyWeightKg: BODY_WEIGHT_KG,
  halfLifeHours: HALF_LIFE_HOURS,
});

const { examScores } = scoreMultiDaySchedule({
  habitualBedTime: HABITUAL_BED_TIME,
  habitualWakeTime: HABITUAL_WAKE_TIME,
  schedule: { nights: best.nights, doses: best.doses },
  examTimes,
  bodyWeightKg: BODY_WEIGHT_KG,
  halfLifeHours: HALF_LIFE_HOURS,
});

// 연속 타임라인 좌표(24×dayIndex를 더한 값)를 "dayN HH:MM" 형태로 되돌린다.
function formatClock(t: number): string {
  const dayIndex = Math.floor(t / 24);
  const hourOfDay = ((t % 24) + 24) % 24;
  const hh = String(Math.floor(hourOfDay)).padStart(2, "0");
  const mm = String(Math.round((hourOfDay % 1) * 60)).padStart(2, "0");
  return `day${dayIndex} ${hh}:${mm}`;
}

const rows: string[] = ["type,index,label,time_coord,clock"];

best.nights.forEach((night, i) => {
  rows.push(`night,${i},취침,${night.bedTime.toFixed(2)},${formatClock(night.bedTime)}`);
  rows.push(`night,${i},기상,${night.wakeTime.toFixed(2)},${formatClock(night.wakeTime)}`);
});

best.doses.forEach((dose, i) => {
  rows.push(`dose,${i},카페인 ${dose.amountMg}mg,${dose.time.toFixed(2)},${formatClock(dose.time)}`);
});

examScores.forEach((exam, i) => {
  rows.push(`exam,${i},P(t)=${exam.score.toFixed(4)},${exam.examTime.toFixed(2)},${formatClock(exam.examTime)}`);
});

const outPath = process.argv[2] ?? "./tmp/multi-day-schedule.csv";
writeFileSync(outPath, rows.join("\n"), "utf-8");
console.log(`검증용 CSV 저장 완료: ${outPath} (${rows.length - 1}행)`);

console.log("\n추천 스케줄:");
best.nights.forEach((night, i) =>
  console.log(`  night[${i}] 취침 ${formatClock(night.bedTime)} → 기상 ${formatClock(night.wakeTime)}`),
);
best.doses.forEach((dose, i) => console.log(`  dose[${i}] ${formatClock(dose.time)} 카페인 ${dose.amountMg}mg`));

console.log("\n시험별 P(t):");
examScores.forEach((exam) => console.log(`  ${formatClock(exam.examTime)} → P=${exam.score.toFixed(4)}`));

console.log(`\n최솟값 점수(전체 시험기간 대표): ${best.score.toFixed(4)}`);
