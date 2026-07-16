export type Category = '도시락' | '김밥' | '햄버거샌드위치' | '삼각김밥';
export type CategoryStatus = 'opportunity' | 'neutral' | 'risk';

export interface CategoryAnalysis {
  weekday: number[];
  weekdayLabels: string[];
  bestDayIdx: number;
  time: number[];
  timeLabels: string[];
  bestTimeIdx: number;
  bestTimeSuffix: string;
  peakIdxs: number[];
  bestDay: string;
  salesTrend: string;
  salesGood: boolean | null;
  salesWeekly: number[];
  wasteTrend: string;
  wasteGood: boolean | null;
  wasteWeekly: number[];
  type: CategoryStatus;
  reasons: string[];
}
