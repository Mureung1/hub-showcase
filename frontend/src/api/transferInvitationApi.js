import { apiRequest } from "./apiClient";

export function getTransferInvitationByLink(idToken, linkToken) {
  return apiRequest(`/api/transfer-invitations/by-link/${linkToken}`, {
    method: "GET",
    idToken,
  });
}

export function getTransferInvitationByCode(idToken, invitationCode) {
  return apiRequest("/api/transfer-invitations/by-code", {
    method: "POST",
    idToken,
    body: { invitationCode },
  });
}

