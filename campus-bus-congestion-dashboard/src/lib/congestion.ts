import type { CongestionLevel } from '../types';

export function levelFor(value: number): CongestionLevel {
  if (value >= 70) return { label: '혼잡', color: '#f0453a', soft: '#fde7e5' };
  if (value >= 40) return { label: '보통', color: '#f5a524', soft: '#fef4e2' };
  return { label: '여유', color: '#22c55e', soft: '#e7f8ee' };
}
