// #10 "다중 시험 최적화 — 그리드 결정변수 정의" 검증용 — verifySingleExamSchedule.ts와
// 같은 패턴으로, 후보 개수와 샘플 값을 눈으로 확인한다.
import { buildMultiDayCandidates } from "../calc/multiDayCandidates.js";

const HABITUAL_BED_TIME = 23;
const HABITUAL_WAKE_TIME = 7;

// 3일 연속 시험(각 날짜의 "전날 밤")을 연속 타임라인 좌표로 표현: n일째 밤은 24*n을 더한다
const nights = [0, 1, 2].map((dayIndex) => ({
  habitualBedTime: HABITUAL_BED_TIME + 24 * dayIndex,
  habitualWakeTime: HABITUAL_WAKE_TIME + 24 * (dayIndex + 1),
}));

// 각 날 아침 08:00에 200mg 카페인을 마실 계획이었다고 가정
const plannedDoses = nights.map((night) => ({
  dose: { time: night.habitualWakeTime + 1, amountMg: 200 },
  earliestTime: night.habitualWakeTime,
}));

const { nightBedOptions, nightWakeOptions, doseOptions } = buildMultiDayCandidates({ nights, plannedDoses });

console.log("=== 밤별 취침·기상 후보 개수 (기대값: 각 9개씩, #23에서 축 분리) ===");
nightBedOptions.forEach((bedOptions, i) => {
  console.log(`night[${i}] 취침 후보:`, bedOptions.length, "/ 기상 후보:", nightWakeOptions[i].length);
});

console.log("\n=== night[0] 취침·기상 후보 샘플 3개 ===");
console.log("취침:", nightBedOptions[0].slice(0, 3));
console.log("기상:", nightWakeOptions[0].slice(0, 3));

console.log("\n=== 카페인별 섭취 시각 후보 개수 (기대값: 9개, earliestTime 필터 없으면) ===");
doseOptions.forEach((options, i) => {
  console.log(`dose[${i}] 후보 개수:`, options.length);
});

console.log("\n=== 기상 전 섭취 후보가 걸러지는지 확인 ===");
// dose 시각을 기상 시각보다 50분 이르게 잡으면(offset -1~+1h, 15분 간격이라
// -1h~-0.83h 구간의 후보 몇 개는 earliestTime보다 이르게 됨) 일부가 걸러져야 한다
const earlyDose = {
  dose: { time: nights[0].habitualWakeTime - 50 / 60, amountMg: 200 },
  earliestTime: nights[0].habitualWakeTime,
};
const { doseOptions: earlyOptions } = buildMultiDayCandidates({ nights: [nights[0]], plannedDoses: [earlyDose] });
const violatesEarliest = earlyOptions[0].some((c) => c.time < earlyDose.earliestTime);
console.log("걸러진 후보 개수:", 9 - earlyOptions[0].length, "/ 9");
console.log(violatesEarliest ? "[FAIL] earliestTime보다 이른 후보가 남아있음" : "[OK] earliestTime 이전 후보는 모두 제외됨");
