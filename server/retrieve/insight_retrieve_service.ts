import type { InsightCaptureAuthenticator } from '../insight_capture_service.js';
import type {
  GeminiEmbeddingClient,
  GeminiEmbeddingResult,
} from './gemini_embedding_client.js';
import type {
  InsightEmbeddingStore,
  PendingEmbeddingDocument,
} from './insight_embedding_store.js';
import {
  createDocumentEmbeddingText,
  createQueryEmbeddingText,
  RETRIEVE_INDEX_CATCH_UP_LIMIT,
  RETRIEVE_INDEX_CONCURRENCY,
  RETRIEVE_MAX_TOKENS_PER_EMBEDDING,
  RETRIEVE_SIMILARITY_THRESHOLD,
} from './retrieve_embedding.js';

const MAX_QUERY_LENGTH = 500;

export type InsightRetrieveResult =
  | { insightIds: string[]; ok: true; pendingCount: number }
  | {
      ok: false;
      reason:
        | 'invalid-request'
        | 'permission-denied'
        | 'retrieve-failed'
        | 'usage-limit-reached';
    };

export type ServerInsightRetrieveService = {
  retrieve(
    accessToken: string,
    request: unknown
  ): Promise<InsightRetrieveResult>;
};

type RetrieveDependencies = {
  authenticator: InsightCaptureAuthenticator;
  embedder: GeminiEmbeddingClient;
  store: InsightEmbeddingStore;
};

export function createInsightRetrieveService({
  authenticator,
  embedder,
  store,
}: RetrieveDependencies): ServerInsightRetrieveService {
  return {
    async retrieve(accessToken, request) {
      const userId = await authenticate(authenticator, accessToken);

      if (!userId) {
        return { ok: false, reason: 'permission-denied' };
      }

      const query = parseQuery(request);

      if (!query) {
        return { ok: false, reason: 'invalid-request' };
      }

      let pendingDocuments: PendingEmbeddingDocument[];

      try {
        pendingDocuments = await store.listPending(
          userId,
          RETRIEVE_INDEX_CATCH_UP_LIMIT
        );
      } catch {
        return { ok: false, reason: 'retrieve-failed' };
      }

      const maximumTokens =
        (pendingDocuments.length + 1) * RETRIEVE_MAX_TOKENS_PER_EMBEDDING;
      let reservation;

      try {
        reservation = await store.reserveUsage(maximumTokens);
      } catch {
        return { ok: false, reason: 'retrieve-failed' };
      }

      if (!reservation.ok) {
        return reservation;
      }

      let result: InsightRetrieveResult;
      let settlement:
        | { promptTokens: number; settlement: 'actual' }
        | { settlement: 'reserved-maximum' } = {
        settlement: 'reserved-maximum',
      };

      try {
        const documentResults = await preparePendingDocuments(
          pendingDocuments,
          embedder,
          store,
          userId
        );
        const queryEmbedding = await embedder.embed(
          createQueryEmbeddingText(query)
        );
        const usage = collectUsage([...documentResults, queryEmbedding]);

        if (usage) {
          settlement = {
            promptTokens: usage,
            settlement: 'actual',
          };
        }

        const insightIds = await store.match({
          queryVector: queryEmbedding.vector,
          threshold: RETRIEVE_SIMILARITY_THRESHOLD,
          userId,
        });
        const pendingCount = await store.countPending(userId);

        result = {
          insightIds,
          ok: true,
          pendingCount,
        };
      } catch {
        result = { ok: false, reason: 'retrieve-failed' };
      }

      try {
        await store.reconcileUsage({
          ...settlement,
          reservationId: reservation.reservationId,
        });
      } catch {
        if (!result.ok) {
          return { ok: false, reason: 'retrieve-failed' };
        }
      }

      return result;
    },
  };
}

async function authenticate(
  authenticator: InsightCaptureAuthenticator,
  accessToken: string
) {
  try {
    return await authenticator.authenticate(accessToken);
  } catch {
    return null;
  }
}

function parseQuery(request: unknown) {
  if (!isRecord(request) || typeof request.query !== 'string') {
    return null;
  }

  const query = request.query.trim();

  return query.length > 0 && query.length <= MAX_QUERY_LENGTH ? query : null;
}

async function preparePendingDocuments(
  documents: PendingEmbeddingDocument[],
  embedder: GeminiEmbeddingClient,
  store: InsightEmbeddingStore,
  userId: string
) {
  const results: Array<PromiseSettledResult<GeminiEmbeddingResult>> = [];

  for (
    let start = 0;
    start < documents.length;
    start += RETRIEVE_INDEX_CONCURRENCY
  ) {
    const chunk = documents.slice(start, start + RETRIEVE_INDEX_CONCURRENCY);
    const chunkResults = await Promise.allSettled(
      chunk.map(async (document) => {
        const embedding = await embedder.embed(
          createDocumentEmbeddingText(document)
        );

        await store.completeDocument({
          insightId: document.insightId,
          sourceHash: document.sourceHash,
          userId,
          vector: embedding.vector,
        });

        return embedding;
      })
    );

    results.push(...chunkResults);
  }

  return results;
}

function collectUsage(
  results: Array<
    PromiseSettledResult<GeminiEmbeddingResult> | GeminiEmbeddingResult
  >
) {
  let promptTokens = 0;

  for (const result of results) {
    const embedding =
      'status' in result
        ? result.status === 'fulfilled'
          ? result.value
          : null
        : result;

    if (!embedding || embedding.usage.kind !== 'actual') {
      return null;
    }

    promptTokens += embedding.usage.promptTokens;
  }

  return promptTokens;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
