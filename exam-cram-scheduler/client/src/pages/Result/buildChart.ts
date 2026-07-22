// #25 — 응답의 alertnessTimeline(15분 간격 점 배열)을 결과 화면 SVG 좌표로 바꾼다.
// 그리기(JSX)와 좌표 계산을 나눠서, 계산만 따로 확인할 수 있게 했다.
import type { ScheduleCalculateRequest, ScheduleCalculateResponse } from '../../api/calculateSchedule';
import { formatKstTime, formatKstWeekday, kstDateKey } from './formatSchedule';

// 기존 자리표시용 SVG와 같은 화면 크기를 유지한다(ResultPage.module.css가 이 비율에 맞춰져 있음)
export const VIEW_WIDTH = 320;
export const VIEW_HEIGHT = 170;
/** 곡선이 그려지는 세로 범위. 위는 시험 라벨, 아래는 요일 라벨 자리로 비워둔다 */
const PLOT_TOP = 18;
const PLOT_BOTTOM = 138;

export interface ChartGeometry {
  /** 곡선 자체 */
  linePath: string;
  /** 곡선 아래 채움(그라디언트용) */
  areaPath: string;
  /** 취침~기상 구간 배경 밴드 */
  sleepBands: { x: number; width: number }[];
  /** 카페인 섭취 지점 */
  caffeineMarkers: { x: number; label: string }[];
  /** 시험 시각 — 세로 점선 + 곡선 위의 점 */
  examMarkers: { x: number; y: number; label: string }[];
  /** 가로축 요일 눈금 */
  dayTicks: { x: number; label: string }[];
}

/** 값이 없을 때 그려도 안전한 빈 결과 */
const EMPTY: ChartGeometry = {
  linePath: '',
  areaPath: '',
  sleepBands: [],
  caffeineMarkers: [],
  examMarkers: [],
  dayTicks: [],
};

export function buildChartGeometry(
  response: ScheduleCalculateResponse | null,
  request: ScheduleCalculateRequest | null,
): ChartGeometry {
  const points = response?.alertnessTimeline ?? [];
  if (points.length < 2) return EMPTY;

  const times = points.map((p) => new Date(p.time).getTime());
  const 시작 = times[0];
  const 끝 = times[times.length - 1];
  const 기간 = 끝 - 시작;
  if (기간 <= 0) return EMPTY;

  const scores = points.map((p) => p.score);
  let 최소 = Math.min(...scores);
  let 최대 = Math.max(...scores);
  // 값이 거의 평평하면 0으로 나누게 되므로 최소 폭을 준다
  if (최대 - 최소 < 1e-6) {
    최소 -= 0.5;
    최대 += 0.5;
  }

  /** 시각 -> 가로 좌표 */
  const toX = (ms: number) => ((ms - 시작) / 기간) * VIEW_WIDTH;
  /** 각성도 -> 세로 좌표. 점수가 높을수록 위로 가야 해서 뒤집는다 */
  const toY = (score: number) =>
    PLOT_BOTTOM - ((score - 최소) / (최대 - 최소)) * (PLOT_BOTTOM - PLOT_TOP);

  const 좌표 = points.map((p, i) => ({ x: toX(times[i]), y: toY(p.score) }));

  const linePath = 좌표
    .map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L${VIEW_WIDTH},${PLOT_BOTTOM} L0,${PLOT_BOTTOM} Z`;

  // 화면 밖으로 삐져나온 구간은 잘라낸다(기간을 벗어난 밤·카페인이 있을 수 있음)
  const 자르기 = (x: number) => Math.max(0, Math.min(VIEW_WIDTH, x));

  const sleepBands = (response?.recommendedSchedule.nights ?? [])
    .map((night) => {
      const x1 = 자르기(toX(new Date(night.bedTime).getTime()));
      const x2 = 자르기(toX(new Date(night.wakeTime).getTime()));
      return { x: x1, width: x2 - x1 };
    })
    .filter((band) => band.width > 0);

  const caffeineMarkers = (response?.recommendedSchedule.caffeineDoses ?? [])
    .map((dose) => ({ ms: new Date(dose.time).getTime(), amountMg: dose.amountMg }))
    .filter((dose) => dose.ms >= 시작 && dose.ms <= 끝)
    .map((dose) => ({ x: toX(dose.ms), label: `${formatKstTime(new Date(dose.ms).toISOString())} ${dose.amountMg}mg` }));

  // 시험 시각의 곡선 높이를 알아야 점을 찍을 수 있다 — 가장 가까운 점의 y를 쓴다
  const yAt = (ms: number) => {
    let 가까운 = 0;
    for (let i = 1; i < times.length; i++) {
      if (Math.abs(times[i] - ms) < Math.abs(times[가까운] - ms)) 가까운 = i;
    }
    return 좌표[가까운].y;
  };

  const examMarkers = (request?.exams ?? [])
    .map((exam) => ({ ms: new Date(exam.examDateTime).getTime(), subject: exam.subject }))
    .filter((exam) => exam.ms >= 시작 && exam.ms <= 끝)
    .map((exam) => ({
      x: toX(exam.ms),
      y: yAt(exam.ms),
      label: `${formatKstWeekday(new Date(exam.ms).toISOString())} ${formatKstTime(new Date(exam.ms).toISOString())}`,
    }));

  // 날짜가 바뀌는 지점마다 요일 눈금 하나
  const dayTicks: { x: number; label: string }[] = [];
  let 이전날짜 = '';
  points.forEach((p, i) => {
    const 날짜 = kstDateKey(p.time);
    if (날짜 !== 이전날짜) {
      이전날짜 = 날짜;
      dayTicks.push({ x: toX(times[i]), label: i === 0 ? '오늘' : formatKstWeekday(p.time) });
    }
  });

  return { linePath, areaPath, sleepBands, caffeineMarkers, examMarkers, dayTicks };
}
