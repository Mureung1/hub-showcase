import { describe, expect, it, vi } from 'vitest';

import {
  createGeminiEmbeddingProvider,
  GEMINI_FREE_TIER_EXECUTION_CONFIRMATION,
} from '../gemini_embedding_provider';

describe('Gemini Free Tier 임베딩 제공자', () => {
  it('API key와 승인 확인값이 없으면 네트워크 전에 거부한다', () => {
    const fetchImpl = vi.fn();

    expect(() =>
      createGeminiEmbeddingProvider({
        apiKey: '',
        executionConfirmation: GEMINI_FREE_TIER_EXECUTION_CONFIRMATION,
        fetchImpl,
      })
    ).toThrow(/GEMINI_API_KEY/u);
    expect(() =>
      createGeminiEmbeddingProvider({
        apiKey: 'test-api-key',
        executionConfirmation: '잘못된-확인값',
        fetchImpl,
      })
    ).toThrow(/Free Tier.*승인/u);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('승인된 모델·차원·prompt만 전송하고 token 사용량을 기록한다', async () => {
    const onUsage = vi.fn();
    const vector = Array.from({ length: 768 }, (_, index) => index / 768);
    const fetchImpl = vi.fn(async () => {
      return createResponse({
        embedding: {
          values: vector,
        },
        usageMetadata: {
          promptTokenCount: 17,
        },
      });
    });
    const provider = createGeminiEmbeddingProvider({
      apiKey: 'test-api-key',
      executionConfirmation: GEMINI_FREE_TIER_EXECUTION_CONFIRMATION,
      fetchImpl,
      minimumRequestIntervalMs: 0,
      onUsage,
    });

    await expect(
      provider.embed({
        text: 'task: search result | query: 표현이 다른 검색어',
        taskType: 'query',
      })
    ).resolves.toEqual(vector);

    expect(provider).toMatchObject({
      providerId: 'gemini-developer-api:free-tier:rest-v1beta:768',
      modelId: 'gemini-embedding-2',
      modelRevision: 'stable-alias-observed-2026-07-23',
      dimensions: 768,
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': 'test-api-key',
        },
        body: JSON.stringify({
          content: {
            parts: [
              {
                text: 'task: search result | query: 표현이 다른 검색어',
              },
            ],
          },
          embedContentConfig: {
            autoTruncate: false,
            outputDimensionality: 768,
          },
        }),
      })
    );
    expect(onUsage).toHaveBeenCalledWith({
      promptTokenCount: 17,
    });
  });

  it('HTTP 오류를 retry하지 않고 key·원문·응답 본문을 숨긴다', async () => {
    const fetchImpl = vi.fn(async () => {
      return createResponse(
        {
          error: {
            message: '서버가 원문을 되돌려 준 비밀 응답',
          },
        },
        {
          ok: false,
          status: 429,
        }
      );
    });
    const provider = createGeminiEmbeddingProvider({
      apiKey: '노출되면-안-되는-key',
      executionConfirmation: GEMINI_FREE_TIER_EXECUTION_CONFIRMATION,
      fetchImpl,
      minimumRequestIntervalMs: 0,
    });
    const requestText = '노출되면 안 되는 합성 원문';

    const error = await provider
      .embed({
        text: requestText,
        taskType: 'passage',
      })
      .catch((caught: unknown) => caught);
    const message = error instanceof Error ? error.message : String(error);

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(message).toMatch(/Gemini.*HTTP 429.*input hash/u);
    expect(message).not.toContain('노출되면-안-되는-key');
    expect(message).not.toContain(requestText);
    expect(message).not.toContain('비밀 응답');
  });

  it('잘못된 응답 벡터를 거부한다', async () => {
    const fetchImpl = vi.fn(async () => {
      return createResponse({
        embedding: {
          values: [0.1, 0.2],
        },
      });
    });
    const provider = createGeminiEmbeddingProvider({
      apiKey: 'test-api-key',
      executionConfirmation: GEMINI_FREE_TIER_EXECUTION_CONFIRMATION,
      fetchImpl,
      minimumRequestIntervalMs: 0,
    });

    await expect(
      provider.embed({
        text: 'task: search result | query: 검색어',
        taskType: 'query',
      })
    ).rejects.toThrow(/차원.*768.*2/u);
  });
});

function createResponse(
  body: unknown,
  options: {
    ok?: boolean;
    status?: number;
  } = {}
) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    async json() {
      return body;
    },
  };
}
