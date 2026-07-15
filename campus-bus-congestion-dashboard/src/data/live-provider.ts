import campusManifest from './live-campuses.json';
import type { Campus } from '../types';
import type { BusDataProvider } from './provider';

const samplePattern = [5, 4, 3, 3, 4, 7, 16, 34, 58, 78, 52, 47, 68, 63, 44, 48, 57, 73, 84, 61, 42, 28, 18, 10];

function sampleHours(campusIndex: number, stopIndex: number): number[] {
  const campusFactor = 0.86 + (campusIndex % 5) * 0.05;
  const stopFactor = [1, 0.82, 0.67][stopIndex] ?? 0.75;
  return samplePattern.map((value, hour) => {
    const variation = ((campusIndex * 7 + stopIndex * 11 + hour * 3) % 9) - 4;
    return Math.max(3, Math.min(96, Math.round(value * campusFactor * stopFactor + variation)));
  });
}

const campuses = (campusManifest as Campus[]).map((campus, campusIndex) => ({
  ...campus,
  stops: campus.stops.map((stop, stopIndex) => ({ ...stop, hours: sampleHours(campusIndex, stopIndex) })),
}));

export const liveProvider: BusDataProvider = {
  id: 'national-live',
  label: '실사용 지도',
  status: 'pending',
  campuses,
  notice: '지도와 정류장은 실제 OpenStreetMap 자산이며, 혼잡도 값은 화면 확인용 샘플 데이터입니다.',
};
