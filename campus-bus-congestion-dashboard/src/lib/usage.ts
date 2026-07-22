import type { Campus, DirectionKey, DirectionalStopData, Stop, UsageStatus } from '../types';

export function isUsageReady(stop: Stop | undefined): stop is Stop & { hours: number[] } {
  return stop?.usage?.status === 'ready' && stop.hours?.length === 24;
}

export function directionData(stop: Stop | undefined, direction: DirectionKey | undefined): DirectionalStopData | undefined {
  return direction ? stop?.directions?.[direction] : undefined;
}

export function isDirectionUsageReady(stop: Stop | undefined, direction: DirectionKey | undefined): boolean {
  const data = directionData(stop, direction);
  return data?.usage.status === 'ready' && data.usage.hours?.length === 24;
}

export function directionHours(stop: Stop | undefined, direction: DirectionKey | undefined): number[] | undefined {
  const data = directionData(stop, direction);
  return data?.usage.status === 'ready' && data.usage.hours?.length === 24 ? data.usage.hours : undefined;
}

export function campusHasDirectionUsage(campus: Campus, direction?: DirectionKey): boolean {
  const keys: DirectionKey[] = direction ? [direction] : ['a', 'c'];
  return campus.stops.some((stop) => keys.some((key) => isDirectionUsageReady(stop, key)));
}

export function campusHasUsage(campus: Campus): boolean {
  return campus.directionConfig ? campusHasDirectionUsage(campus) : campus.stops.some(isUsageReady);
}

export function formatUsagePeriod(period: string | undefined): string {
  if (!period || !/^\d{6}$/.test(period)) return '기준 월 미정';
  return `${period.slice(0, 4)}년 ${Number(period.slice(4))}월`;
}

export function usageStatusLabel(stop: Stop): string {
  switch (stop.usage?.status) {
    case 'ready': return '통계 제공';
    case 'unsupported-region': return '지원 지역 외';
    case 'no-data': return '해당 월 자료 없음';
    default: return '정류장 매핑 필요';
  }
}

export function usageStatusText(status: UsageStatus | undefined, directional = false): string {
  switch (status) {
    case 'ready': return '통계 제공';
    case 'unsupported-region': return '지원 지역 외';
    case 'no-data': return '해당 월 자료 없음';
    default: return directional ? '방향 자료 없음' : '정류장 매핑 필요';
  }
}

export function directionUsageStatusLabel(stop: Stop, direction: DirectionKey): string {
  return usageStatusText(directionData(stop, direction)?.usage.status, true);
}
