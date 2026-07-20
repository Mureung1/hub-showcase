// #12 "다중 시험 최적화 — 로컬 탐색 휴리스틱 구현" 검증용.
// 1) 실행 시간이 "수 초 이내"인지
// 2) 무작위 초기값을 바꿔가며 여러 번 돌려도 결과 품질이 크게 안 튀는지(수렴 확인)
// 3) 평소 스케줄 그대로 쓴 점수보다 같거나 나은 결과를 찾는지(완전탐색 없이도 개선되는지)
import { buildMultiDayCandidates } from "../calc/multiDayCandidates.js";
import { scoreMultiDaySchedule } from "../calc/multiDayObjective.js";
import { searchMultiDaySchedule } from "../calc/multiDayLocalSearch.js";
import { sensitivityToHalfLife } from "../calc/sensitivityToHalfLife.js";

const HABITUAL_BED_TIME = 23;
const HABITUAL_WAKE_TIME = 7;
const BODY_WEIGHT_KG = 65;
const HALF_LIFE_HOURS = sensitivityToHalfLife("보통");

// 3일짜리 시험기간. night[k]는 "day(k+1) 아침으로 이어지는 밤"이라서, 그 아침의
// 카페인·시험도 전부 day(k+1) 좌표(24×(k+1))를 써야 서로 어긋나지 않는다.
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

// 평소 스케줄(오프셋 0) 그대로 썼을 때의 점수 — 비교 기준선
const habitualSchedule = {
  nights: nights.map((n, i) => ({ bedTime: n.habitualBedTime, wakeTime: n.habitualWakeTime })),
  doses: plannedDoses.map((p) => p.dose),
};
const habitualResult = scoreMultiDaySchedule({
  habitualBedTime: HABITUAL_BED_TIME,
  habitualWakeTime: HABITUAL_WAKE_TIME,
  schedule: habitualSchedule,
  examTimes,
  bodyWeightKg: BODY_WEIGHT_KG,
  halfLifeHours: HALF_LIFE_HOURS,
});

console.log("평소 스케줄 그대로 썼을 때 최솟값(기준선):", habitualResult.score.toFixed(4));

console.log("\n=== 1)+2) 여러 번 실행 — 실행시간과 수렴 확인 ===");
const RUNS = 8;
const scores: number[] = [];
const start = Date.now();

for (let run = 0; run < RUNS; run++) {
  const result = searchMultiDaySchedule({
    habitualBedTime: HABITUAL_BED_TIME,
    habitualWakeTime: HABITUAL_WAKE_TIME,
    candidates,
    examTimes,
    bodyWeightKg: BODY_WEIGHT_KG,
    halfLifeHours: HALF_LIFE_HOURS,
  });
  scores.push(result.score);
  console.log(`run[${run}] 점수:`, result.score.toFixed(4));
}

const elapsedMs = Date.now() - start;
const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;
const stddev = Math.sqrt(variance);
const range = Math.max(...scores) - Math.min(...scores);

console.log(`\n${RUNS}번 실행 총 소요시간: ${elapsedMs}ms (평균 ${(elapsedMs / RUNS).toFixed(1)}ms/회)`);
console.log("점수 평균:", mean.toFixed(4), "/ 표준편차:", stddev.toFixed(4), "/ 최대-최소 범위:", range.toFixed(4));
console.log(elapsedMs < 5000 ? "[OK] 전체 실행 시간이 수 초 이내" : "[FAIL] 실행 시간이 너무 김");
console.log(stddev < 0.02 ? "[OK] 무작위 초기값을 바꿔도 결과가 안정적으로 수렴함" : "[FAIL] 결과 편차가 큼 — 반복 횟수/온도 조정 필요");

console.log("\n=== 3) 평소 스케줄 대비 개선 여부 ===");
const bestOfRuns = Math.max(...scores);
console.log("탐색 결과 중 최고점:", bestOfRuns.toFixed(4), "vs 평소 스케줄:", habitualResult.score.toFixed(4));
console.log(
  bestOfRuns >= habitualResult.score
    ? "[OK] 탐색 결과가 평소 스케줄보다 같거나 높음"
    : "[FAIL] 탐색 결과가 평소 스케줄보다 낮음 — 버그 의심",
);
