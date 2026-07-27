import { supabaseAdminClient } from "../../common/config/supabase";
import { PayrollScheduleRecord, PayrollWorkerWageRecord } from "./payroll.types";

const PAYROLL_SCHEDULE_COLUMNS = "id,store_id,worker_id,work_date,start_time,end_time";
const PAYROLL_WAGE_COLUMNS = "user_id,hourly_wage";

export async function findPayrollSchedules(
  storeId: string,
  fromDate: string,
  toDate: string,
  workerId?: string
) {
  let query = supabaseAdminClient
    .from("schedules")
    .select(PAYROLL_SCHEDULE_COLUMNS)
    .eq("store_id", storeId)
    .gte("work_date", fromDate)
    .lte("work_date", toDate);

  if (workerId) {
    query = query.eq("worker_id", workerId);
  }

  const { data, error } = await query
    .order("work_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as PayrollScheduleRecord[];
}

export async function findPayrollWorkerWages(storeId: string, workerIds: string[]) {
  if (workerIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdminClient
    .from("store_members")
    .select(PAYROLL_WAGE_COLUMNS)
    .eq("store_id", storeId)
    .in("user_id", workerIds);

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as PayrollWorkerWageRecord[];
}
