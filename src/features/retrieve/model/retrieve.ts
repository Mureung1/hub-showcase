export type RetrieveFailureReason =
  | 'invalid-request'
  | 'permission-denied'
  | 'retrieve-failed'
  | 'usage-limit-reached';

export type RetrieveResult =
  | { insightIds: string[]; ok: true; pendingCount: number }
  | { ok: false; reason: RetrieveFailureReason };

export type RetrieveService = {
  retrieve(query: string): Promise<RetrieveResult>;
};
