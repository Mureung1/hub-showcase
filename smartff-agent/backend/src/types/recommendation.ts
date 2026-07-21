/**
 * Recommendation API 타입 정의
 */

export type RuleId =
  | 'SALES_UP_WASTE_LOW'
  | 'SALES_DOWN_WASTE_UP'
  | 'LOW_MARGIN';

export type Severity = 'high' | 'medium' | 'low';

export interface Recommendation {
  category: string;
  month: number;
  rule: RuleId;
  severity: Severity;
  title: string;
  reason: string;
  metrics: {
    sales_qty: number;
    sales_qty_prev: number;
    waste_rate: number;
    waste_rate_prev: number;
    category_avg_waste_rate: number;
    margin_rate: number;
    overall_avg_margin_rate: number;
    net_income: number;
    net_income_prev: number;
  };
}

export interface RecommendationResponse {
  month: number;
  data: Recommendation[];
}
