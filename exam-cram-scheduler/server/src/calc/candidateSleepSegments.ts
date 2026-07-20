// 2주차 목요일 "목표 각성 시각 역산" — 후보 취침·기상 시각을 평가하려면
// 예열 며칠(WARMUP_DAYS)은 평소 패턴대로 자다가, 시험 전날 밤만 후보 취침·기상 시각으로 바꾼
// 수면압(Process S) 구간이 필요하다. 그 구간을 만들고, 특정 시각이 속한 구간을 찾는 두 함수.
import { sleepPressure, type SleepPressureSegment } from "./processS.js";

const H_MIN = 0.17; // Process S의 H(t) 최솟값(가장 안 피곤). 예열 시작점으로 사용
export const WARMUP_DAYS = 3; // 정상상태로 수렴시키는 예열 일수(verifyAlertnessCurve.ts와 동일)

/**
 * 예열(habitualBedTime·habitualWakeTime 반복) 며칠 뒤, 시험 전날 밤만
 * candidateBedTime·candidateWakeTime로 바꾼 하루치 수면압 구간을 만든다.
 * 반환되는 마지막(기상 후) 구간은 candidateWakeTime과 같은 값에서 시작하므로,
 * 시험 시작 시각·카페인 섭취 시각을 그대로 같은 좌표계(자정 기준 경과 시간)에서 비교하면 된다.
 */
export function buildCandidateSegments(
  habitualBedTime: number,
  habitualWakeTime: number,
  candidateBedTime: number,
  candidateWakeTime: number,
  warmupDays: number = WARMUP_DAYS,
): SleepPressureSegment[] {
  const segments: SleepPressureSegment[] = [];

  const habitualAwakeDuration = habitualBedTime - habitualWakeTime;
  const habitualSleepDuration = 24 - habitualAwakeDuration;

  let startTime = habitualWakeTime - 24 * (warmupDays + 1);
  let startPressure = H_MIN;

  for (let day = 0; day < warmupDays; day++) {
    const awake: SleepPressureSegment = { startTime, startPressure, isAsleep: false };
    segments.push(awake);
    startTime += habitualAwakeDuration;
    startPressure = sleepPressure(startTime, awake);

    const asleep: SleepPressureSegment = { startTime, startPressure, isAsleep: true };
    segments.push(asleep);
    startTime += habitualSleepDuration;
    startPressure = sleepPressure(startTime, asleep);
  }

  // 시험 전날: 후보 취침 시각까지는 평소처럼 깨어있다가
  const awakeBeforeCandidateBed: SleepPressureSegment = { startTime, startPressure, isAsleep: false };
  segments.push(awakeBeforeCandidateBed);
  startTime += candidateBedTime - habitualWakeTime;
  startPressure = sleepPressure(startTime, awakeBeforeCandidateBed);

  const candidateSleep: SleepPressureSegment = { startTime, startPressure, isAsleep: true };
  segments.push(candidateSleep);
  startTime += candidateWakeTime + 24 - candidateBedTime;
  startPressure = sleepPressure(startTime, candidateSleep);

  segments.push({ startTime, startPressure, isAsleep: false });

  return segments;
}

export function segmentAt(segments: SleepPressureSegment[], t: number): SleepPressureSegment {
  let current = segments[0];
  for (const segment of segments) {
    if (segment.startTime > t) break;
    current = segment;
  }
  return current;
}

/**
 * 3주차 "다중 시험 최적화 — 목적함수 구현"(#11)용 — buildCandidateSegments()가 후보 밤
 * 하나만 다뤘다면, 이 함수는 그걸 여러 밤(night)으로 일반화한 것.
 *
 * nights[i]의 bedTime·wakeTime은 반드시 다음 규칙을 따르는 연속 타임라인 좌표여야 한다
 * (multiDayCandidates.ts의 nightCandidates()가 만드는 형태 그대로):
 *   night[i].bedTime  = habitualBedTime  + 24×i
 *   night[i].wakeTime = habitualWakeTime + 24×(i+1)
 * (여기에 그리드 오프셋이 더해진 값). 시험 시각도 같은 좌표계를 써야 한다 — 예를 들어
 * night[0] 다음 날 시험이면 examTime = (시험 시각) + 24.
 *
 * N=1(밤 하나)일 때 buildCandidateSegments()와 같은 방식으로 계산되는지는
 * verifyMultiDayObjective.ts에서 회귀 검증한다.
 */
export function buildMultiNightSegments(
  habitualBedTime: number,
  habitualWakeTime: number,
  nights: { bedTime: number; wakeTime: number }[],
  warmupDays: number = WARMUP_DAYS,
): SleepPressureSegment[] {
  const segments: SleepPressureSegment[] = [];

  const habitualAwakeDuration = habitualBedTime - habitualWakeTime;
  const habitualSleepDuration = 24 - habitualAwakeDuration;

  let startTime = habitualWakeTime - 24 * warmupDays;
  let startPressure = H_MIN;

  for (let day = 0; day < warmupDays; day++) {
    const awake: SleepPressureSegment = { startTime, startPressure, isAsleep: false };
    segments.push(awake);
    startTime += habitualAwakeDuration;
    startPressure = sleepPressure(startTime, awake);

    const asleep: SleepPressureSegment = { startTime, startPressure, isAsleep: true };
    segments.push(asleep);
    startTime += habitualSleepDuration;
    startPressure = sleepPressure(startTime, asleep);
  }

  // 이 시점 startTime === habitualWakeTime — nights[0]이 이어받는 원점
  for (const night of nights) {
    const awake: SleepPressureSegment = { startTime, startPressure, isAsleep: false };
    segments.push(awake);
    startTime = night.bedTime;
    startPressure = sleepPressure(startTime, awake);

    const asleep: SleepPressureSegment = { startTime, startPressure, isAsleep: true };
    segments.push(asleep);
    startTime = night.wakeTime;
    startPressure = sleepPressure(startTime, asleep);
  }

  segments.push({ startTime, startPressure, isAsleep: false });

  return segments;
}
