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
