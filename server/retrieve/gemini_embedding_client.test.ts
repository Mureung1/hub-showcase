import { describe, expect, it, vi } from 'vitest';

import { createGeminiEmbeddingClient } from './gemini_embedding_client';

describe('Gemini 꺼내보기 임베딩', () => {
  it('768차원 벡터와 실제 입력 토큰 수를 반환한다', async () => {
    const embedContent = vi.fn().mockResolvedValue({
      embeddings: [{ values: Array(768).fill(0.01) }],
      usageMetadata: { promptTokenCount: 17 },
    });
    const client = createGeminiEmbeddingClient({ embedContent });

    await expect(client.embed('검색 입력')).resolves.toEqual({
      usage: { kind: 'actual', promptTokens: 17 },
      vector: Array(768).fill(0.01),
    });
    expect(embedContent).toHaveBeenCalledWith({
      config: {
        abortSignal: expect.any(AbortSignal),
        httpOptions: { timeout: 10_000 },
        outputDimensionality: 768,
      },
      contents: '검색 입력',
      model: 'gemini-embedding-2',
    });
  });

  it('토큰 정보가 없는 정상 벡터를 보수 정산 대상으로 반환한다', async () => {
    const client = createGeminiEmbeddingClient({
      embedContent: vi.fn().mockResolvedValue({
        embeddings: [{ values: Array(768).fill(0.01) }],
      }),
    });

    await expect(client.embed('검색 입력')).resolves.toEqual({
      usage: { kind: 'unavailable' },
      vector: Array(768).fill(0.01),
    });
  });

  it('null 토큰 정보를 정상 벡터의 보수 정산 대상으로 반환한다', async () => {
    const client = createGeminiEmbeddingClient({
      embedContent: vi.fn().mockResolvedValue({
        embeddings: [{ values: Array(768).fill(0.01) }],
        usageMetadata: { promptTokenCount: null },
      }),
    });

    await expect(client.embed('검색 입력')).resolves.toEqual({
      usage: { kind: 'unavailable' },
      vector: Array(768).fill(0.01),
    });
  });

  it('Gemini 요청에 제한 시간과 중단 신호를 전달한다', async () => {
    const embedContent = vi.fn().mockResolvedValue({
      embeddings: [{ values: Array(768).fill(0.01) }],
      usageMetadata: { promptTokenCount: 17 },
    });
    const client = createGeminiEmbeddingClient({
      embedContent,
      requestTimeoutMs: 25,
    });

    await client.embed('검색 입력');

    expect(embedContent).toHaveBeenCalledWith({
      config: {
        abortSignal: expect.any(AbortSignal),
        httpOptions: { timeout: 25 },
        outputDimensionality: 768,
      },
      contents: '검색 입력',
      model: 'gemini-embedding-2',
    });
  });

  it.each([
    {
      embedContent: vi.fn().mockResolvedValue({
        embeddings: [{ values: Array(767).fill(0.01) }],
      }),
      label: '잘못된 벡터',
    },
    {
      embedContent: vi.fn().mockRejectedValue(new Error('검색 입력 노출')),
      label: 'SDK 오류',
    },
  ])('$label를 원문이 없는 일반 오류로 바꾼다', async ({ embedContent }) => {
    const client = createGeminiEmbeddingClient({ embedContent });
    const error = await client.embed('민감한 검색 입력').catch((reason) => reason);

    expect(error).toEqual(new Error('검색 벡터를 만들지 못했습니다.'));
    expect(String(error)).not.toContain('민감한 검색 입력');
  });
});
