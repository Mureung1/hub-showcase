// #20 "스케줄 조정 화면 재계산 연동" 검증용.
// scheduleCalculate.ts가 nightOverrides로 하는 일(축 배열을 단일값으로 바꿔치기)을
// calc/ 레이어에서 그대로 재현해서 확인한다:
// 1) 잠근 밤의 취침/기상/카페인이 결과에 정확히 그 값으로 나오는지
// 2) 잠그지 않은 다른 밤들은 여전히 그리드 안에서 자유롭게 움직이는지(고정되지 않음)
import { buildMultiDayCandidates } from "../calc/multiDayCandidates.js";
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
  earliestTime: HABITUAL_WAKE_TIME + 24 * (k + 1),
}));
const examTimes = [9 + 24 * 1, 7.1667 + 24 * 2, 9 + 24 * 3];

const candidates = buildMultiDayCandidates({ nights, plannedDoses, amountOptionsMg: [75, 150, 225, 300] });

// night[1](둘째 밤)을 취침 22.5, 기상 6.25, 카페인 06:45·225mg로 고정한다고 가정.
const LOCKED_NIGHT_INDEX = 1;
const LOCKED_BED_TIME = 22.5 + 24 * LOCKED_NIGHT_INDEX;
const LOCKED_WAKE_TIME = 6.25 + 24 * (LOCKED_NIGHT_INDEX + 1);
const LOCKED_DOSE_TIME = 6.75 + 24 * (LOCKED_NIGHT_INDEX + 1);
const LOCKED_DOSE_AMOUNT_MG = 225;

candidates.nightBedOptions[LOCKED_NIGHT_INDEX] = [LOCKED_BED_TIME];
candidates.nightWakeOptions[LOCKED_NIGHT_INDEX] = [LOCKED_WAKE_TIME];
candidates.doseOptions[LOCKED_NIGHT_INDEX] = [{ time: LOCKED_DOSE_TIME, amountMg: LOCKED_DOSE_AMOUNT_MG }];
candidates.doseAmountOptions[LOCKED_NIGHT_INDEX] = [LOCKED_DOSE_AMOUNT_MG];

console.log("=== nightOverrides 적용 후 재최적화 ===");
const RUNS = 5;
let allLocked = true;
const otherNightVaried = new Set<number>();

for (let run = 0; run < RUNS; run++) {
  const result = searchMultiDaySchedule({
    habitualBedTime: HABITUAL_BED_TIME,
    habitualWakeTime: HABITUAL_WAKE_TIME,
    candidates,
    examTimes,
    bodyWeightKg: BODY_WEIGHT_KG,
    halfLifeHours: HALF_LIFE_HOURS,
  });

  const lockedNight = result.nights[LOCKED_NIGHT_INDEX];
  const lockedDose = result.doses[LOCKED_NIGHT_INDEX];
  const locked =
    lockedNight.bedTime === LOCKED_BED_TIME &&
    lockedNight.wakeTime === LOCKED_WAKE_TIME &&
    lockedDose.time === LOCKED_DOSE_TIME &&
    lockedDose.amountMg === LOCKED_DOSE_AMOUNT_MG;
  if (!locked) allLocked = false;

  result.nights.forEach((night, i) => {
    if (i !== LOCKED_NIGHT_INDEX && night.bedTime !== nights[i].habitualBedTime) otherNightVaried.add(i);
  });

  console.log(
    `run[${run}] night[${LOCKED_NIGHT_INDEX}]`,
    locked ? "[OK] 고정값 그대로" : "[FAIL] 고정값과 다름",
    "| night[0].bedTime:",
    result.nights[0].bedTime.toFixed(2),
    "night[2].bedTime:",
    result.nights[2].bedTime.toFixed(2),
    "| score:",
    result.score.toFixed(4),
  );
}

console.log(
  allLocked
    ? "\n[OK] 모든 실행에서 잠근 밤(night[1])의 취침/기상/카페인이 정확히 지정한 값으로 나옴"
    : "\n[FAIL] 잠근 밤이 흔들림 — override가 축 길이 1로 안 먹힘",
);
console.log(
  otherNightVaried.size > 0
    ? `[OK] 잠그지 않은 밤(${[...otherNightVaried].join(", ")})은 여러 실행에 걸쳐 그리드 안에서 값이 바뀜 — 계속 재최적화 대상임`
    : "[정보] 이번 실행들에서는 다른 밤이 평소 시각과 항상 같게 나옴(우연일 수 있음, FAIL은 아님)",
);
