import { apiRequest } from "../../shared/api";
import { UpdateWorkerResponse, WorkersResponse } from "./workerTypes";

export type UpdateWorkerInput = {
  hourlyWage?: number | null;
  defaultWorkStartTime?: string | null;
  defaultWorkEndTime?: string | null;
};

export async function getWorkers(accessToken: string, storeId: string) {
  return apiRequest<WorkersResponse>(`/stores/${storeId}/workers`, {
    accessToken
  });
}

export async function updateWorker(accessToken: string, storeId: string, workerId: string, input: UpdateWorkerInput) {
  return apiRequest<UpdateWorkerResponse>(`/stores/${storeId}/workers/${workerId}`, {
    method: "PATCH",
    accessToken,
    body: input
  });
}
