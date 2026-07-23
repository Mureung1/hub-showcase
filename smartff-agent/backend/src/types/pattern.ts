/**
 * Weekday / Hourly Sales Pattern API 타입 정의
 */

export interface WeekdayPatternRecord {
  month: string;
  category: string;
  weekday: string;
  avg_sales_amount: number;
}

export interface HourlyPatternRecord {
  month: string;
  category: string;
  hour: number;
  avg_sales_amount: number;
}

export interface WeekdayPatternResponse {
  category: string;
  month: string;
  data: WeekdayPatternRecord[];
}

export interface HourlyPatternResponse {
  category: string;
  month: string;
  data: HourlyPatternRecord[];
}
