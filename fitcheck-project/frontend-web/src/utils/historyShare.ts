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

/** Latest consult for a gym that has member-visible trainer feedback content */
export function getMemberVisibleConsultFeedback(
  requests: ConsultRequest[],
  gymId: string,
): ConsultRequest | undefined {
  return requests
    .filter((request) => request.gymId === gymId && !!request.reportSavedAt)
    .filter((request) => {
      const hasFeedback = Boolean(request.userFeedback?.trim());
      const hasSharedMemo =
        request.shareMemoWithMember === true &&
        Boolean(request.trainerReportMemo?.trim());
      return hasFeedback || hasSharedMemo;
    })
    .sort((a, b) => (a.reportSavedAt! < b.reportSavedAt! ? 1 : -1))[0];
}
