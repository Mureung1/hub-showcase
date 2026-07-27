import { StoreMembershipContext } from "../../common/types/storeMembership";

export type PayrollScope = "STORE" | "WORKER";

export type PayrollScheduleRecord = {
  id: string;
  store_id: string;
  worker_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
};

export type PayrollWorkerWageRecord = {
  user_id: string;
  hourly_wage: number | string | null;
};

export type PayrollSummaryInput = {
  storeId: string;
  fromDate: string;
  toDate: string;
  membership: StoreMembershipContext;
};

export type PayrollSummaryResponse = {
  storeId: string;
  fromDate: string;
  toDate: string;
  scope: PayrollScope;
  scheduleCount: number;
  totalHours: number;
  estimatedPay: number;
  missingWageCount: number;
};
