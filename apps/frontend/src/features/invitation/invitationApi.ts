import { apiRequest } from "../../shared/api";
import {
  AcceptInvitationResponse,
  CancelInvitationResponse,
  CreateInvitationResponse,
  PendingInvitationsResponse
} from "./invitationTypes";

export type CreateInvitationInput = {
  inviteeEmail: string;
  hourlyWage?: number | null;
  defaultWorkStartTime?: string | null;
  defaultWorkEndTime?: string | null;
};

export async function createInvitation(accessToken: string, storeId: string, input: CreateInvitationInput) {
  return apiRequest<CreateInvitationResponse>(`/stores/${storeId}/invitations`, {
    method: "POST",
    accessToken,
    body: input
  });
}

export async function cancelInvitation(accessToken: string, storeId: string, invitationId: string) {
  return apiRequest<CancelInvitationResponse>(`/stores/${storeId}/invitations/${invitationId}/cancel`, {
    method: "PATCH",
    accessToken
  });
}

export async function getPendingInvitations(accessToken: string) {
  return apiRequest<PendingInvitationsResponse>("/invitations/pending", {
    accessToken
  });
}

export async function acceptInvitation(accessToken: string, invitationId: string) {
  return apiRequest<AcceptInvitationResponse>(`/invitations/${invitationId}/accept`, {
    method: "PATCH",
    accessToken
  });
}
