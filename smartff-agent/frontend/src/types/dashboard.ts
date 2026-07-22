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
  riskLabel?: string;
}
