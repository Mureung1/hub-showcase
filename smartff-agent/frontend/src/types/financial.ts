export interface FinancialRecord {
  month: number;
  category: string;
  sales_qty: number;
  sales_amount: number;
  avg_selling_price: number;
  waste_qty: number;
  waste_amount: number;
  avg_unit_cost: number;
  avg_cost_rate: number;
  margin_amount: number;
  margin_rate: number;
  waste_rate: number;
  net_income: number;
  net_rate: number;
}

export interface FinancialSummary {
  period: {
    start: string;
    end: string;
  };
  data: FinancialRecord[];
  summary: {
    total_sales: number;
    total_waste: number;
    total_net_income: number;
    avg_margin_rate: number;
    avg_waste_rate: number;
    avg_net_rate: number;
  };
}

export interface CategorySummary {
  category: string;
  months: number;
  total_sales: number;
  avg_margin_rate: number;
  avg_waste_rate: number;
  avg_net_rate: number;
}
