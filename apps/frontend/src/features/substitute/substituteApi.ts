import { apiRequest } from "../../shared/api";
import {
  ApplySubstituteRequestResponse,
  CreateSubstituteRequestInput,
  CreateSubstituteRequestResponse,
  SubstituteRequestsResponse
} from "./substituteTypes";

export async function getSubstituteRequests(accessToken: string, storeId: string) {
  return apiRequest<SubstituteRequestsResponse>(`/stores/${storeId}/substitute-requests`, {
    accessToken
  });
}

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

export async function applySubstituteRequest(accessToken: string, requestId: string) {
  return apiRequest<ApplySubstituteRequestResponse>(`/substitute-requests/${requestId}/apply`, {
    method: "PATCH",
    accessToken
  });
}
