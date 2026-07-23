import { findSchedulesByStoreAndDateRange } from "./schedules.repository";
import { ScheduleRecord, ScheduleResponse } from "./schedules.types";

function toScheduleResponse(schedule: ScheduleRecord): ScheduleResponse {
  return {
    id: schedule.id,
    storeId: schedule.store_id,
    workerId: schedule.worker_id,
    workerName: schedule.profiles.name,
    workDate: schedule.work_date,
    startTime: schedule.start_time,
    endTime: schedule.end_time,
    position: schedule.position,
    memo: schedule.memo,
    source: schedule.source,
    createdAt: schedule.created_at,
    updatedAt: schedule.updated_at
  };
}

export async function listStoreSchedules(storeId: string, fromDate: string, toDate: string) {
  const schedules = await findSchedulesByStoreAndDateRange(storeId, fromDate, toDate);

  return {
    schedules: schedules.map(toScheduleResponse)
  };
}

export async function listStoreSchedulesByDate(storeId: string, workDate: string) {
  const schedules = await findSchedulesByStoreAndDateRange(storeId, workDate, workDate);

  return {
    schedules: schedules.map(toScheduleResponse)
  };
}
