export type PendingEmbeddingDocument = {
  insightId: string;
  memo: string | null;
  sourceHash: string;
  title: string;
};

export type InsightEmbeddingStore = {
  completeDocument(input: {
    insightId: string;
    sourceHash: string;
    userId: string;
    vector: number[];
  }): Promise<void>;
  countPending(userId: string): Promise<number>;
  listPending(
    userId: string,
    limit: number
  ): Promise<PendingEmbeddingDocument[]>;
  match(input: {
    queryVector: number[];
    threshold: number;
    userId: string;
  }): Promise<string[]>;
  reconcileUsage(
    input:
      | {
          promptTokens: number;
          reservationId: string;
          settlement: 'actual';
        }
      | {
          reservationId: string;
          settlement: 'reserved-maximum';
        }
  ): Promise<void>;
  reserveUsage(
    maxTokens: number
  ): Promise<
    | { ok: true; reservationId: string }
    | { ok: false; reason: 'usage-limit-reached' }
  >;
};
