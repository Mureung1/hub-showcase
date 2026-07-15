import type { ConsultRequest } from '../types/consult';

export function hasActiveHistoryShare(
  requests: ConsultRequest[],
  gymId?: string,
): boolean {
  return requests.some(
    (request) =>
      request.shareHistoryConsent === true &&
      (gymId == null || request.gymId === gymId),
  );
}

export function getActiveHistoryShareRequest(
  requests: ConsultRequest[],
  gymId: string,
): ConsultRequest | undefined {
  return requests.find(
    (request) =>
      request.shareHistoryConsent === true && request.gymId === gymId,
  );
}
