import type { Campus, Stop } from '../types';

const COORDS = [
  { cx: 110, cy: 248 },
  { cx: 250, cy: 54 },
  { cx: 338, cy: 214 },
];

// Representative hourly patterns: quiet overnight, class start, lunch, and evening peaks.
const BASE_HOURS = [4, 3, 2, 2, 3, 5, 10, 26, 55, 80, 50, 54, 72, 68, 46, 48, 52, 74, 80, 54, 36, 30, 24, 12];

function scaleHours(stopMultiplier: number, campusMultiplier: number): number[] {
  return BASE_HOURS.map((value) => Math.max(1, Math.min(100, Math.round(value * stopMultiplier * campusMultiplier))));
}

function buildStops(names: [string, string, string], campusMultiplier: number): Stop[] {
  const stopMultipliers = [1.0, 0.82, 0.6];
  return names.map((name, index) => ({
    id: `s${index}`,
    name,
    cx: COORDS[index].cx,
    cy: COORDS[index].cy,
    hours: scaleHours(stopMultipliers[index], campusMultiplier),
  }));
}

export const CAMPUSES: Campus[] = [
  { id: 'knu', name: '경북대학교', stops: buildStops(['정문 A', '북문', '정문 B'], 1.0) },
  { id: 'pnu', name: '부산대학교', stops: buildStops(['장전역', '정문', '부산대역'], 0.95) },
  { id: 'jnu', name: '전남대학교', stops: buildStops(['정문', '용봉로', '후문'], 0.9) },
  { id: 'cnu', name: '충남대학교', stops: buildStops(['정문', '궁동', '서문'], 0.85) },
  { id: 'jbnu', name: '전북대학교', stops: buildStops(['정문', '신정문', '구정문'], 0.92) },
];

export const CAMPUS_BY_ID: Record<string, Campus> = Object.fromEntries(CAMPUSES.map((campus) => [campus.id, campus]));
export const DEFAULT_CAMPUS_ID = 'knu';
