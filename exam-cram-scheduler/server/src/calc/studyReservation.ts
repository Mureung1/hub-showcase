// ② "남은 공부량" 반영(2026-07-30 결정) — 추천 스케줄에서 "시험 전에 깨어서 공부할 수
// 있는 시간"을 재고, 사용자가 입력한 남은 공부량에 못 미치면 그 부족분(시간)을 잰다.
//
// 근사 방침: "안 자는 시간 = 공부 시간"으로 본다(벼락치기 도구라 이 가정이 크게 이상하지
// 않다고 사용자와 합의). 시험이 여러 개면 시험별로 따로 보되, "직전 시험(없으면 지금)부터
// 이 시험까지" 구간으로 끊어서 같은 깨어있는 시간을 두 시험에 중복으로 세지 않는다.
//
// 이 부족분은 두 곳에서 쓰인다:
//  - 라우트: 추천 결과에 대해 계산해 경고("N시간 부족")로 내려준다.
//  - 목적함수: 사용자가 "공부 시간 확보"를 택하면(enforceStudyTime) 이 부족분을 점수에서
//    깎아, 탐색이 "덜 자고 더 깨어있는"(=공부 시간을 확보하는) 스케줄을 고르게 한다.
import type { SleepPressureSegment } from "./processS.js";

/** 시험 하나의 "공부 필요량". examTime은 목적함수와 같은 연속 좌표계여야 한다. */
export interface ExamStudyNeed {
  examTime: number;
  requiredHours: number;
}

/** 시험별 공부 시간 계산 결과 — 필요/확보/부족을 그대로 노출해 근거를 확인할 수 있게 한다. */
export interface ExamStudyResult {
  examTime: number;
  requiredHours: number;
  /** 이 시험 전 구간에서 깨어있는(공부 가능한) 시간 */
  availableHours: number;
  /** max(0, 필요 - 확보) */
  shortfallHours: number;
}

export interface StudyShortfallResult {
  /** 시험별 부족분의 합(시간). 0이면 모든 시험이 공부 시간을 확보함. */
  total: number;
  byExam: ExamStudyResult[];
}

/**
 * [start, end) 구간에서 "깨어있는"(isAsleep=false) 시간의 합을 잰다.
 * buildMultiNightSegments가 만든 구간 배열을 그대로 받는다 — 각 구간은
 * segments[i].startTime부터 segments[i+1].startTime까지 이어지고, 마지막 구간은
 * (기상 후 열린 구간이라) end까지로 본다.
 */
function awakeHoursBetween(segments: SleepPressureSegment[], start: number, end: number): number {
  if (end <= start) return 0;
  let awake = 0;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const segmentStart = segment.startTime;
    const segmentEnd = i + 1 < segments.length ? segments[i + 1].startTime : end;
    const overlapStart = Math.max(start, segmentStart);
    const overlapEnd = Math.min(end, segmentEnd);
    if (overlapEnd > overlapStart && !segment.isAsleep) {
      awake += overlapEnd - overlapStart;
    }
  }
  return awake;
}

/**
 * 시험별 공부 부족 시간을 계산한다.
 *
 * @param segments buildMultiNightSegments()가 만든 수면/각성 구간
 * @param needs 시험별 공부 필요량(순서 무관 — 내부에서 시각순으로 정렬한다)
 * @param windowStart 공부를 시작할 수 있는 가장 이른 시각(보통 "지금"의 연속 좌표)
 */
export function computeStudyShortfall(
  segments: SleepPressureSegment[],
  needs: ExamStudyNeed[],
  windowStart: number,
): StudyShortfallResult {
  // 시각 오름차순으로 정렬해 "직전 시험 ~ 이 시험" 구간을 겹치지 않게 끊는다.
  const sorted = [...needs].sort((a, b) => a.examTime - b.examTime);

  let previousBoundary = windowStart;
  const byExam: ExamStudyResult[] = sorted.map((need) => {
    const availableHours = awakeHoursBetween(segments, previousBoundary, need.examTime);
    const shortfallHours = Math.max(0, need.requiredHours - availableHours);
    previousBoundary = need.examTime;
    return {
      examTime: need.examTime,
      requiredHours: need.requiredHours,
      availableHours,
      shortfallHours,
    };
  });

  const total = byExam.reduce((sum, exam) => sum + exam.shortfallHours, 0);
  return { total, byExam };
}
