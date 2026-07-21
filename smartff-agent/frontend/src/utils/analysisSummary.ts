export function weekdaySummary(weekday: number[], bestDayName: string, bestIdx: number): string {
  const best = weekday[bestIdx];
  const others = weekday.filter((_, i) => i !== bestIdx);
  const avgOthers = others.reduce((a, b) => a + b, 0) / others.length;
  const diff = Math.round(((best - avgOthers) / avgOthers) * 100);
  const dir = diff >= 0 ? '높습니다' : '낮습니다';
  return `${bestDayName}이 나머지 요일 평균보다 ${Math.abs(diff)}% ${dir}.`;
}

export function timeSummary(time: number[], labels: string[], peakIdxs: number[]): string {
  const total = time.reduce((a, b) => a + b, 0);
  const peakSum = peakIdxs.reduce((a, i) => a + time[i], 0);
  const share = Math.round((peakSum / total) * 100);
  const startLabel = labels[peakIdxs[0]];
  const endLabel = labels[peakIdxs[peakIdxs.length - 1]];
  return `${startLabel}-${endLabel} 구간에서 판매량의 ${share}% 발생합니다.`;
}

export function trendSummary(weekly: number[], isWaste: boolean): string {
  const last4 = weekly.slice(-4);
  const prev4 = weekly.slice(-8, -4);
  const avgLast = last4.reduce((a, b) => a + b, 0) / last4.length;
  const avgPrev = prev4.reduce((a, b) => a + b, 0) / prev4.length;
  const diff = avgLast - avgPrev;
  if (isWaste) {
    const maxLast4 = Math.max(...last4);
    if (diff > avgPrev * 0.08) return `최근 1개월 폐기율 상승 추세, 최고 ${maxLast4.toFixed(1)}%까지 확인됩니다.`;
    return `최근 1개월 ${maxLast4.toFixed(1)}% 이하 범위 내 안정 유지 중입니다.`;
  }
  if (diff > avgPrev * 0.03) return '최근 1개월 지속 상승세입니다.';
  if (diff < -avgPrev * 0.03) return '최근 1개월 지속 하락세입니다.';
  return '최근 1개월 보합세를 유지하고 있습니다.';
}

// merged_dataset.csv는 월 단위 집계라(최대 6개월), 주 단위 trendSummary의 4주-vs-4주 비교 대신
// 최신월 vs 직전월 비교로 판단한다.
export function monthlyTrendSummary(values: number[], isWaste: boolean): string {
  if (values.length < 2) return '데이터가 더 필요합니다.';

  const latest = values[values.length - 1];
  const prev = values[values.length - 2];
  const diff = latest - prev;

  if (isWaste) {
    const max = Math.max(...values);
    if (diff > Math.abs(prev) * 0.08) return `최근 1개월 폐기율 상승 추세, 최고 ${max.toFixed(1)}%까지 확인됩니다.`;
    return `최근 1개월 ${max.toFixed(1)}% 이하 범위 내 안정 유지 중입니다.`;
  }

  if (diff > Math.abs(prev) * 0.03) return '최근 1개월 지속 상승세입니다.';
  if (diff < -Math.abs(prev) * 0.03) return '최근 1개월 지속 하락세입니다.';
  return '최근 1개월 보합세를 유지하고 있습니다.';
}

export interface SvgSeries {
  points: string;
  polygon: string;
  dots: { cx: number; cy: number; r: number }[];
}

export function seriesToSvg(values: number[], width: number, height: number, padX: number): SvgSeries {
  // 0을 기준선으로 고정 — min~max로 자동 스케일하면 작은 변동도 과장되어 보임
  const min = Math.min(0, ...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const usableW = width - padX * 2;
  const topPad = 20;
  const bottomY = height - 24;
  const usableH = bottomY - topPad;
  const coords = values.map((v, i) => {
    const x = padX + (usableW * i) / (values.length - 1);
    const y = bottomY - ((v - min) / range) * usableH;
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });
  const points = coords.map((p) => `${p.x},${p.y}`).join(' ');
  return {
    points,
    polygon: `${points} ${width - padX},${bottomY} ${padX},${bottomY}`,
    dots: coords.map((p, i) => ({ cx: p.x, cy: p.y, r: i === coords.length - 1 ? 6 : 5 })),
  };
}
