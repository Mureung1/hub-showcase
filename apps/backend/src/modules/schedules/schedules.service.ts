import { HttpError } from "../../common/errors/HttpError";
import { findWorkerMembership } from "../workers/workers.repository";
import { findOverlappingWorkerSchedules, findSchedulesByStoreAndDateRange, insertSchedule } from "./schedules.repository";
import { CreateScheduleInput, ScheduleRecord, ScheduleResponse } from "./schedules.types";

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

export async function createStoreSchedule(input: CreateScheduleInput) {
  const worker = await findWorkerMembership(input.storeId, input.workerId);

  if (!worker) {
    throw new HttpError(400, "선택한 알바생이 이 매장에 소속되어 있지 않습니다.", "WORKER_NOT_IN_STORE");
  }

  const overlappingSchedules = await findOverlappingWorkerSchedules(input);

  if (overlappingSchedules.length > 0) {
    throw new HttpError(409, "이미 겹치는 근무가 있습니다.", "SCHEDULE_TIME_OVERLAP");
  }

  const schedule = await insertSchedule({
    ...input,
    source: "MANUAL"
  });

  return {
    schedule: toScheduleResponse(schedule)
  };
}
