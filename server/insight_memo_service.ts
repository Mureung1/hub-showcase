const MAX_MEMO_LENGTH = 200;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type InsightMemoAuthenticator = {
  authenticate(accessToken: string): Promise<string | null>;
};

export type InsightMemoStoreResult = {
  status: 'not-found' | 'permission-denied' | 'updated' | 'write-failed';
};

export type InsightMemoStore = {
  updateMemo(
    userId: string,
    insightId: string,
    memo: string | null
  ): Promise<InsightMemoStoreResult>;
};

export type InsightMemoStoreFactory = (accessToken: string) => InsightMemoStore;

export type InsightMemoResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        'invalid-request' | 'not-found' | 'permission-denied' | 'write-failed';
    };

export type ServerInsightMemoService = {
  update(
    accessToken: string,
    insightId: string,
    request: unknown
  ): Promise<InsightMemoResult>;
};

export function createInsightMemoService(
  authenticator: InsightMemoAuthenticator,
  createStore: InsightMemoStoreFactory
): ServerInsightMemoService {
  return {
    async update(accessToken, insightId, request) {
      const userId = await authenticator.authenticate(accessToken);

      if (!userId) {
        return { ok: false, reason: 'permission-denied' };
      }

      const memo = parseMemoRequest(insightId, request);

      if (!memo.ok) {
        return memo;
      }

      const result = await createStore(accessToken).updateMemo(
        userId,
        insightId,
        memo.value
      );

      return result.status === 'updated'
        ? { ok: true }
        : { ok: false, reason: result.status };
    },
  };
}

function parseMemoRequest(
  insightId: string,
  request: unknown
):
  | { ok: true; value: string | null }
  | { ok: false; reason: 'invalid-request' } {
  if (
    !UUID_PATTERN.test(insightId) ||
    !isRecord(request) ||
    typeof request.memo !== 'string' ||
    [...request.memo].length > MAX_MEMO_LENGTH
  ) {
    return { ok: false, reason: 'invalid-request' };
  }

  return { ok: true, value: request.memo.trim() || null };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
