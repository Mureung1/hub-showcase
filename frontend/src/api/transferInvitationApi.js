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

export function acceptTransferInvitation(
  idToken,
  invitationId,
  relationship,
) {
  return apiRequest(
    `/api/transfer-invitations/${invitationId}/accept`,
    {
      method: "POST",
      idToken,
      body: relationship,
    },
  );
}

