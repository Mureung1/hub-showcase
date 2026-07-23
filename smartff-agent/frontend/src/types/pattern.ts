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
  month: string | null;
  data: WeekdayPatternRecord[];
}

export interface HourlyPatternResponse {
  category: string;
  month: string | null;
  data: HourlyPatternRecord[];
}
