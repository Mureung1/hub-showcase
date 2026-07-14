// 개발_일정.md 2주차 수요일 "간단한 스크립트로 하루치 곡선 뽑아서 눈으로 검증" 작업용.
// 23시 취침·7시 기상을 며칠 반복해서 정상상태(steady state)에 도달시킨 뒤,
// 마지막 하루 동안 15분 간격으로 P(t)(카페인 포함 최종 각성도)를 CSV로 뽑는다.
import { writeFileSync } from "node:fs";
import { alertness } from "../calc/alertness.js";
import { baselineAlertness } from "../calc/baselineAlertness.js";
import { sleepPressure, type SleepPressureSegment } from "../calc/processS.js";
import { caffeineConcentration, type CaffeineDose } from "../calc/caffeineConcentration.js";
import { caffeineEffect } from "../calc/caffeineEffect.js";
import { sensitivityToHalfLife } from "../calc/sensitivityToHalfLife.js";

const WAKE_HOUR = 7;
const SLEEP_HOUR = 23;
const WARMUP_DAYS = 3; // 정상상태로 수렴시키기 위한 예열 일수

function buildSegments(days: number): SleepPressureSegment[] {
  const segments: SleepPressureSegment[] = [];
  // 예열 시작점: 첫 기상 시각(H_MIN 근처에서 출발한다고 가정)
  let startTime = WAKE_HOUR - 24 * WARMUP_DAYS;
  let startPressure = 0.17; // Process S의 최솟값(H_MIN)에서 출발
  let isAsleep = false;

  const totalSegments = (days + WARMUP_DAYS) * 2;
  for (let i = 0; i < totalSegments; i++) {
    const segment: SleepPressureSegment = { startTime, startPressure, isAsleep };
    segments.push(segment);

    const duration = isAsleep ? WAKE_HOUR + 24 - SLEEP_HOUR : SLEEP_HOUR - WAKE_HOUR;
    const nextTime = startTime + duration;
    const nextPressure = sleepPressure(nextTime, segment);

    startTime = nextTime;
    startPressure = nextPressure;
    isAsleep = !isAsleep;
  }
  return segments;
}

function segmentAt(segments: SleepPressureSegment[], t: number): SleepPressureSegment {
  let current = segments[0];
  for (const segment of segments) {
    if (segment.startTime > t) break;
    current = segment;
  }
  return current;
}

const segments = buildSegments(1);

// 검증용 예시 시나리오: 체중 65kg, 카페인 민감도 "보통", 08시 커피 200mg + 13시 에너지드링크 150mg
const BODY_WEIGHT_KG = 65;
const HALF_LIFE_HOURS = sensitivityToHalfLife("보통");
const DOSES: CaffeineDose[] = [
  { time: WAKE_HOUR + 1, amountMg: 200 }, // 08:00 커피
  { time: 13, amountMg: 150 }, // 13:00 에너지드링크
];

const rows: string[] = [
  "time,hour,H_sleepPressure,P0_baseline,concentration_mgL,gPD_effect,P_final",
];

for (let t = 0; t <= 24; t += 0.25) {
  const segment = segmentAt(segments, t);
  const H = sleepPressure(t, segment);
  const P0 = baselineAlertness(t, segment);
  const concentration = DOSES.reduce(
    (sum, dose) => sum + caffeineConcentration(t, dose, BODY_WEIGHT_KG, HALF_LIFE_HOURS),
    0,
  );
  const gPD = caffeineEffect(t, concentration, segment);
  const P = alertness(t, segment, DOSES, BODY_WEIGHT_KG, HALF_LIFE_HOURS);

  const hourLabel = `${String(Math.floor(t) % 24).padStart(2, "0")}:${t % 1 === 0 ? "00" : "15"}`;
  rows.push(
    [t.toFixed(2), hourLabel, H.toFixed(4), P0.toFixed(4), concentration.toFixed(4), gPD.toFixed(4), P.toFixed(4)].join(","),
  );
}

const outPath = process.argv[2] ?? "./tmp/alertness-curve.csv";
writeFileSync(outPath, rows.join("\n"), "utf-8");
console.log(`검증용 CSV 저장 완료: ${outPath} (${rows.length - 1}개 시점)`);
