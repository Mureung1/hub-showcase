import { apiRequest } from "../../shared/api";
import { CreateSubstituteRequestInput, CreateSubstituteRequestResponse } from "./substituteTypes";

export async function createSubstituteRequest(
  accessToken: string,
  storeId: string,
  input: CreateSubstituteRequestInput
) {
  return apiRequest<CreateSubstituteRequestResponse>(`/stores/${storeId}/substitute-requests`, {
    method: "POST",
    accessToken,
    body: input
  });
}
