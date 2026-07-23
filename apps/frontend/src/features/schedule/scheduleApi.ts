import { apiRequest } from "../../shared/api";
import { SchedulesResponse } from "./scheduleTypes";

export async function getSchedules(accessToken: string, storeId: string, fromDate: string, toDate: string) {
  const params = new URLSearchParams({
    from: fromDate,
    to: toDate
  });

  return apiRequest<SchedulesResponse>(`/stores/${storeId}/schedules?${params.toString()}`, {
    accessToken
  });
}
