export interface WeeklyTrendPoint {
  label: string;
  amount: number;
  tooltip: string;
}

export interface MarginBarItem {
  name: string;
  rate: number;
  delta: string;
  deltaGood: boolean;
  isTop: boolean;
  isAiPick: boolean;
  isRisk: boolean;
}

export interface DashboardData {
  storeName: string;
  storeStatus: string;
  brief: {
    titleHighlight: string;
    titleRest: string;
    reasons: string[];
    ctaLabel: string;
  };
  risk: {
    title: string;
    reasons: string[];
    ctaLabel: string;
  };
  kpis: {
    salesTrend: string;
    salesNote: string;
    wasteRate: string;
    wasteNote: string;
    marginRate: string;
    marginNote: string;
  };
  weeklyTrend: {
    totalLabel: string;
    points: WeeklyTrendPoint[];
    bestWeek: string;
  };
  marginBars: MarginBarItem[];
}
