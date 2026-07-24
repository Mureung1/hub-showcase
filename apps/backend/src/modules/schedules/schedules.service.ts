import { HttpError } from "../../common/errors/HttpError";
import { findStoreMembership } from "../../common/repositories/storeMembership.repository";
import { findWorkerMembership } from "../workers/workers.repository";
import {
  deleteScheduleById,
  deleteRecurringScheduleRuleById,
  findOverlappingWorkerSchedules,
  findScheduleById,
  findSchedulesByStoreAndDateRange,
  insertRecurringScheduleRule,
  insertSchedule,
  insertSchedules,
  updateScheduleById
} from "./schedules.repository";
import {
  CreateRecurringSchedulesInput,
  CreateScheduleInput,
  DeleteScheduleInput,
  RecurringScheduleRuleRecord,
  RecurringScheduleRuleResponse,
  ScheduleRecord,
  ScheduleResponse,
  UpdateScheduleInput
} from "./schedules.types";

const MAX_RECURRING_RANGE_DAYS = 84;

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

function toRecurringScheduleRuleResponse(rule: RecurringScheduleRuleRecord): RecurringScheduleRuleResponse {
  return {
    id: rule.id,
    storeId: rule.store_id,
    workerId: rule.worker_id,
    weekday: rule.weekday,
    startTime: rule.start_time,
    endTime: rule.end_time,
    startDate: rule.start_date,
    endDate: rule.end_date,
    position: rule.position,
    memo: rule.memo,
    createdAt: rule.created_at,
    updatedAt: rule.updated_at
  };
}

function parseDateText(dateText: string) {
  const [yearText, monthText, dayText] = dateText.split("-");

  return new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
}

function formatDateText(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateDifferenceInDays(fromDate: Date, toDate: Date) {
  const fromTime = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()).getTime();
  const toTime = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate()).getTime();

  return Math.round((toTime - fromTime) / (24 * 60 * 60 * 1000));
}

function createRecurringWorkDates(input: Pick<CreateRecurringSchedulesInput, "weekday" | "startDate" | "endDate">) {
  const startDate = parseDateText(input.startDate);
  const endDate = parseDateText(input.endDate);
  const workDates: string[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    if (currentDate.getDay() === input.weekday) {
      workDates.push(formatDateText(currentDate));
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workDates;
}

async function findManageableSchedule(scheduleId: string, actorUserId: string) {
  const schedule = await findScheduleById(scheduleId);

  if (!schedule) {
    throw new HttpError(404, "근무 일정을 찾을 수 없습니다.", "SCHEDULE_NOT_FOUND");
  }

  const membership = await findStoreMembership(schedule.store_id, actorUserId);

  if (!membership || membership.role !== "OWNER") {
    throw new HttpError(403, "사장님 권한이 필요합니다.", "OWNER_ROLE_REQUIRED");
  }

  return schedule;
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

export async function editStoreSchedule(input: UpdateScheduleInput) {
  const existingSchedule = await findManageableSchedule(input.scheduleId, input.actorUserId);
  const nextWorkerId = input.workerId ?? existingSchedule.worker_id;
  const nextWorkDate = input.workDate ?? existingSchedule.work_date;
  const nextStartTime = input.startTime ?? existingSchedule.start_time;
  const nextEndTime = input.endTime ?? existingSchedule.end_time;
  const nextPosition = input.position !== undefined ? input.position : existingSchedule.position;
  const nextMemo = input.memo !== undefined ? input.memo : existingSchedule.memo;

  if (nextEndTime <= nextStartTime) {
    throw new HttpError(400, "종료 시간은 시작 시간보다 늦어야 합니다.", "INVALID_SCHEDULE_TIME");
  }

  const worker = await findWorkerMembership(existingSchedule.store_id, nextWorkerId);

  if (!worker) {
    throw new HttpError(400, "선택한 알바생이 이 매장에 소속되어 있지 않습니다.", "WORKER_NOT_IN_STORE");
  }

  const overlappingSchedules = await findOverlappingWorkerSchedules({
    storeId: existingSchedule.store_id,
    workerId: nextWorkerId,
    workDate: nextWorkDate,
    startTime: nextStartTime,
    endTime: nextEndTime,
    excludeScheduleId: input.scheduleId
  });

  if (overlappingSchedules.length > 0) {
    throw new HttpError(409, "이미 겹치는 근무가 있습니다.", "SCHEDULE_TIME_OVERLAP");
  }

  const schedule = await updateScheduleById({
    scheduleId: input.scheduleId,
    workerId: nextWorkerId,
    workDate: nextWorkDate,
    startTime: nextStartTime,
    endTime: nextEndTime,
    position: nextPosition,
    memo: nextMemo
  });

  return {
    schedule: toScheduleResponse(schedule)
  };
}

export async function removeStoreSchedule(input: DeleteScheduleInput) {
  await findManageableSchedule(input.scheduleId, input.actorUserId);
  await deleteScheduleById(input.scheduleId);
}

export async function createStoreRecurringSchedules(input: CreateRecurringSchedulesInput) {
  const startDate = parseDateText(input.startDate);
  const endDate = parseDateText(input.endDate);
  const rangeDays = getDateDifferenceInDays(startDate, endDate);

  if (rangeDays > MAX_RECURRING_RANGE_DAYS) {
    throw new HttpError(400, "반복 근무는 최대 12주까지만 등록할 수 있습니다.", "RECURRING_RANGE_TOO_LONG");
  }

  const worker = await findWorkerMembership(input.storeId, input.workerId);

  if (!worker) {
    throw new HttpError(400, "선택한 알바생이 이 매장에 소속되어 있지 않습니다.", "WORKER_NOT_IN_STORE");
  }

  const workDates = createRecurringWorkDates(input);

  if (workDates.length === 0) {
    throw new HttpError(400, "생성할 반복 근무 날짜가 없습니다.", "NO_RECURRING_WORK_DATES");
  }

  for (const workDate of workDates) {
    const overlappingSchedules = await findOverlappingWorkerSchedules({
      storeId: input.storeId,
      workerId: input.workerId,
      workDate,
      startTime: input.startTime,
      endTime: input.endTime
    });

    if (overlappingSchedules.length > 0) {
      throw new HttpError(409, `${workDate}에 이미 겹치는 근무가 있습니다.`, "SCHEDULE_TIME_OVERLAP");
    }
  }

  const rule = await insertRecurringScheduleRule(input);
  let schedules: ScheduleRecord[];

  try {
    schedules = await insertSchedules(
      workDates.map((workDate) => ({
        storeId: input.storeId,
        workerId: input.workerId,
        workDate,
        startTime: input.startTime,
        endTime: input.endTime,
        position: input.position,
        memo: input.memo,
        source: "RECURRING"
      }))
    );
  } catch (error) {
    await deleteRecurringScheduleRuleById(rule.id);
    throw error;
  }

  return {
    rule: toRecurringScheduleRuleResponse(rule),
    schedules: schedules.map(toScheduleResponse)
  };
}
