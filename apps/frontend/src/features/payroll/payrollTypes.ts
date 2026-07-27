export type PayrollScope = "STORE" | "WORKER";

export type PayrollSummary = {
  storeId: string;
  fromDate: string;
  toDate: string;
  scope: PayrollScope;
  scheduleCount: number;
  totalHours: number;
  estimatedPay: number;
  missingWageCount: number;
};
