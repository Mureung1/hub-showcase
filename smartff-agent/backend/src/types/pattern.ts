/**
 * Weekday / Hourly Sales Pattern API 타입 정의
 */

export interface WeekdayPatternRecord {
  category: string;
  weekday: string;
  avg_sales_amount: number;
}

export interface HourlyPatternRecord {
  category: string;
  hour: number;
  avg_sales_amount: number;
}

export interface WeekdayPatternResponse {
  category: string;
  data: WeekdayPatternRecord[];
}

export interface HourlyPatternResponse {
  category: string;
  data: HourlyPatternRecord[];
}
