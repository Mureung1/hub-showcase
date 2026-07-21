// #15 — 요청에 들어온 취침/기상 시각(HH:MM)과 시험 날짜들을, multiDayCandidates.ts가
// 요구하는 연속 타임라인 좌표계로 정리한다.
import { parseHourMinute, toContinuousCoordinate } from "./kstTime.js";

export interface ExamTimelineInput {
  nowIso: string;
  habitualBedTime: string;
  habitualWakeTime: string;
  examDateTimesIso: string[];
}

export interface ExamTimelineResult {
  /** 연속 좌표계 취침/기상 기준값. 자정 넘겨 자는 경우(예: "00:30") 24를 더해 보정됨 */
  habitualBedTime: number;
  habitualWakeTime: number;
  /** night[0..numNights-1] — 오늘 밤부터 마지막 시험 전날 밤까지 필요한 밤의 개수 */
  numNights: number;
  /** 요청에 들어온 순서 그대로, 시험별 연속 좌표 시각 */
  examTimes: number[];
}

export function buildExamTimeline(input: ExamTimelineInput): ExamTimelineResult {
  const { nowIso, habitualBedTime, habitualWakeTime, examDateTimesIso } = input;

  const wakeHour = parseHourMinute(habitualWakeTime);
  let bedHour = parseHourMinute(habitualBedTime);
  if (bedHour < wakeHour) bedHour += 24; // 자정 넘겨 자는 취침시각 보정(예: 00:30 -> 24.5)

  const examTimes = examDateTimesIso.map((iso) => toContinuousCoordinate(nowIso, iso));
  const examDayIndices = examTimes.map((t) => Math.floor(t / 24));
  const numNights = Math.max(...examDayIndices);

  if (numNights < 1) {
    throw new Error("시험 시각은 최소 내일 이후여야 합니다(당일 시험은 아직 지원하지 않음).");
  }

  return { habitualBedTime: bedHour, habitualWakeTime: wakeHour, numNights, examTimes };
}
