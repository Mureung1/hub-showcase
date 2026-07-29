import { GoogleGenAI } from '@google/genai';

import {
  isEmbeddingVector,
  RETRIEVE_EMBEDDING_DIMENSIONS,
  RETRIEVE_EMBEDDING_MODEL,
} from './retrieve_embedding.js';

type EmbedContentInput = {
  config: {
    abortSignal: AbortSignal;
    httpOptions: {
      timeout: number;
    };
    outputDimensionality: number;
  };
  contents: string;
  model: string;
};

type EmbedContentResponse = {
  embeddings?: Array<{
    values?: number[];
  }>;
  usageMetadata?: {
    promptTokenCount?: unknown;
  };
};

type EmbedContent = (
  input: EmbedContentInput
) => Promise<EmbedContentResponse>;

export type GeminiEmbeddingResult = {
  usage:
    | { kind: 'actual'; promptTokens: number }
    | { kind: 'unavailable' };
  vector: number[];
};

export type GeminiEmbeddingClient = {
  embed(input: string): Promise<GeminiEmbeddingResult>;
};

const SAFE_EMBEDDING_ERROR = '검색 벡터를 만들지 못했습니다.';
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

export function createGeminiEmbeddingClient({
  embedContent,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
}: {
  embedContent: EmbedContent;
  requestTimeoutMs?: number;
}): GeminiEmbeddingClient {
  return {
    async embed(input) {
      try {
        const response = await embedContent({
          config: {
            abortSignal: AbortSignal.timeout(requestTimeoutMs),
            httpOptions: { timeout: requestTimeoutMs },
            outputDimensionality: RETRIEVE_EMBEDDING_DIMENSIONS,
          },
          contents: input,
          model: RETRIEVE_EMBEDDING_MODEL,
        });
        const vector = response.embeddings?.[0]?.values;

        if (!isEmbeddingVector(vector)) {
          throw new Error(SAFE_EMBEDDING_ERROR);
        }

        const promptTokens = response.usageMetadata?.promptTokenCount;

        if (promptTokens === undefined || promptTokens === null) {
          return {
            usage: { kind: 'unavailable' },
            vector,
          };
        }

        if (
          typeof promptTokens !== 'number' ||
          !Number.isInteger(promptTokens) ||
          promptTokens < 0
        ) {
          throw new Error(SAFE_EMBEDDING_ERROR);
        }

        return {
          usage: { kind: 'actual', promptTokens },
          vector,
        };
      } catch {
        throw new Error(SAFE_EMBEDDING_ERROR);
      }
    },
  };
}

export function createGoogleGeminiEmbeddingClient(
  apiKey: string,
  requestTimeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS
): GeminiEmbeddingClient {
  const client = new GoogleGenAI({ apiKey });

  return createGeminiEmbeddingClient({
    embedContent: (input) => client.models.embedContent(input),
    requestTimeoutMs,
  });
}
