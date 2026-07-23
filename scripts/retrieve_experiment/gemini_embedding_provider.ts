import { createHash } from 'node:crypto';

import {
  normalizeEmbeddingInput,
  validateEmbeddingVector,
  type EmbeddingProvider,
  type EmbeddingRequest,
} from './embedding_provider';

export const GEMINI_FREE_TIER_EXECUTION_CONFIRMATION =
  'free-tier-synthetic-72-documents-45-queries-approved-2026-07-23';

const GEMINI_MODEL_ID = 'gemini-embedding-2';
const GEMINI_MODEL_REVISION = 'stable-alias-observed-2026-07-23';
const GEMINI_OUTPUT_DIMENSIONS = 768;
const GEMINI_EMBEDDING_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_ID}:embedContent`;

export type GeminiEmbeddingUsage = Readonly<{
  promptTokenCount: number;
}>;

type GeminiHttpResponse = Readonly<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

type GeminiFetch = (
  url: string,
  init: RequestInit
) => Promise<GeminiHttpResponse>;

export type GeminiEmbeddingProviderOptions = Readonly<{
  apiKey: string;
  executionConfirmation: string;
  fetchImpl?: GeminiFetch;
  minimumRequestIntervalMs?: number;
  requestTimeoutMs?: number;
  onUsage?(usage: GeminiEmbeddingUsage): void;
}>;

export function createGeminiEmbeddingProvider(
  options: GeminiEmbeddingProviderOptions
): EmbeddingProvider {
  const apiKey = requireNonEmptyString(options.apiKey, 'GEMINI_API_KEY');

  if (
    options.executionConfirmation !== GEMINI_FREE_TIER_EXECUTION_CONFIRMATION
  ) {
    throw new Error(
      'Gemini Free Tier 합성 실행에 대한 승인 확인값이 없습니다.'
    );
  }

  const fetchImpl =
    options.fetchImpl ?? ((url: string, init: RequestInit) => fetch(url, init));
  const minimumRequestIntervalMs = requireNonNegativeInteger(
    options.minimumRequestIntervalMs ?? 1000,
    'Gemini 요청 최소 간격'
  );
  const requestTimeoutMs = requirePositiveInteger(
    options.requestTimeoutMs ?? 30_000,
    'Gemini 요청 제한 시간'
  );
  let lastRequestStartedAt = 0;

  return {
    providerId: 'gemini-developer-api:free-tier:rest-v1beta:768',
    modelId: GEMINI_MODEL_ID,
    modelRevision: GEMINI_MODEL_REVISION,
    dimensions: GEMINI_OUTPUT_DIMENSIONS,
    async embed(request) {
      const text = normalizeEmbeddingInput(request.text);
      const inputHash = createAnonymousInputHash(request);
      const elapsedMs = Date.now() - lastRequestStartedAt;
      const remainingIntervalMs = Math.max(
        0,
        minimumRequestIntervalMs - elapsedMs
      );

      if (remainingIntervalMs > 0) {
        await wait(remainingIntervalMs);
      }

      lastRequestStartedAt = Date.now();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
      let response: GeminiHttpResponse;

      try {
        response = await fetchImpl(GEMINI_EMBEDDING_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            content: {
              parts: [{ text }],
            },
            embedContentConfig: {
              autoTruncate: false,
              outputDimensionality: GEMINI_OUTPUT_DIMENSIONS,
            },
          }),
          signal: controller.signal,
        });
      } catch {
        throw new Error(
          `Gemini embedding API 네트워크 오류 (input hash: ${inputHash})`
        );
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        throw new Error(
          `Gemini embedding API HTTP ${response.status} (input hash: ${inputHash})`
        );
      }

      let body: unknown;

      try {
        body = await response.json();
      } catch {
        throw new Error(
          `Gemini embedding API 응답 JSON 오류 (input hash: ${inputHash})`
        );
      }

      const parsed = parseGeminiEmbeddingResponse(body, inputHash);

      if (parsed.promptTokenCount !== null) {
        options.onUsage?.({
          promptTokenCount: parsed.promptTokenCount,
        });
      }

      return validateEmbeddingVector(parsed.vector, GEMINI_OUTPUT_DIMENSIONS);
    },
  };
}

function parseGeminiEmbeddingResponse(
  value: unknown,
  inputHash: string
): {
  vector: readonly number[];
  promptTokenCount: number | null;
} {
  const response = requireRecord(
    value,
    `Gemini embedding API 응답 (input hash: ${inputHash})`
  );
  const embedding = requireRecord(
    response.embedding,
    `Gemini embedding API embedding (input hash: ${inputHash})`
  );

  if (
    !Array.isArray(embedding.values) ||
    !embedding.values.every((item) => typeof item === 'number')
  ) {
    throw new Error(
      `Gemini embedding API 벡터 형식 오류 (input hash: ${inputHash})`
    );
  }

  if (response.usageMetadata === undefined) {
    return {
      vector: embedding.values,
      promptTokenCount: null,
    };
  }

  const usageMetadata = requireRecord(
    response.usageMetadata,
    `Gemini embedding API usageMetadata (input hash: ${inputHash})`
  );
  const promptTokenCount = usageMetadata.promptTokenCount;

  if (
    !Number.isSafeInteger(promptTokenCount) ||
    (promptTokenCount as number) < 0
  ) {
    throw new Error(
      `Gemini embedding API token 사용량 오류 (input hash: ${inputHash})`
    );
  }

  return {
    vector: embedding.values,
    promptTokenCount: promptTokenCount as number,
  };
}

function createAnonymousInputHash(request: EmbeddingRequest): string {
  return createHash('sha256')
    .update(
      JSON.stringify([request.taskType, normalizeEmbeddingInput(request.text)])
    )
    .digest('hex')
    .slice(0, 12);
}

function requireRecord(
  value: unknown,
  fieldName: string
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${fieldName} 형식이 잘못되었습니다.`);
  }

  return value as Record<string, unknown>;
}

function requireNonEmptyString(value: string, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName}이 필요합니다.`);
  }

  return value.trim();
}

function requireNonNegativeInteger(value: number, fieldName: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${fieldName}은 0 이상의 정수여야 합니다.`);
  }

  return value;
}

function requirePositiveInteger(value: number, fieldName: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${fieldName}은 양의 정수여야 합니다.`);
  }

  return value;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
