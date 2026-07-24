import { apiRequest } from "../../shared/api";
import {
  CreateScheduleInput,
  CreateScheduleResponse,
  CreateRecurringSchedulesInput,
  CreateRecurringSchedulesResponse,
  SchedulesResponse,
  UpdateScheduleInput,
  UpdateScheduleResponse
} from "./scheduleTypes";

export async function getSchedules(accessToken: string, storeId: string, fromDate: string, toDate: string) {
  const params = new URLSearchParams({
    from: fromDate,
    to: toDate
  });

  return apiRequest<SchedulesResponse>(`/stores/${storeId}/schedules?${params.toString()}`, {
    accessToken
  });
}

export async function getDailySchedules(accessToken: string, storeId: string, workDate: string) {
  return apiRequest<SchedulesResponse>(`/stores/${storeId}/schedules/${workDate}`, {
    accessToken
  });
}

export async function createSchedule(accessToken: string, storeId: string, input: CreateScheduleInput) {
  return apiRequest<CreateScheduleResponse>(`/stores/${storeId}/schedules`, {
    method: "POST",
    accessToken,
    body: input
  });
}

export async function createRecurringSchedules(
  accessToken: string,
  storeId: string,
  input: CreateRecurringSchedulesInput
) {
  return apiRequest<CreateRecurringSchedulesResponse>(`/stores/${storeId}/recurring-schedules`, {
    method: "POST",
    accessToken,
    body: input
  });
}

export async function updateSchedule(accessToken: string, scheduleId: string, input: UpdateScheduleInput) {
  return apiRequest<UpdateScheduleResponse>(`/schedules/${scheduleId}`, {
    method: "PATCH",
    accessToken,
    body: input
  });
}

export async function deleteSchedule(accessToken: string, scheduleId: string) {
  return apiRequest<void>(`/schedules/${scheduleId}`, {
    method: "DELETE",
    accessToken
  });
}
