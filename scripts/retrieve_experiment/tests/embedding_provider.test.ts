import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  createFileEmbeddingCache,
  createEmbeddingCacheKey,
  embedWithCache,
  normalizeEmbeddingInput,
  validateEmbeddingVector,
  type EmbeddingCache,
  type EmbeddingProvider,
} from '../embedding_provider';
import {
  createLocalE5EmbeddingProvider,
  LOCAL_E5_RUNTIME_OPTIONS,
} from '../local_e5_embedding_provider';

function createMemoryCache(): EmbeddingCache {
  const values = new Map<string, readonly number[]>();

  return {
    async get(key) {
      return values.get(key) ?? null;
    },
    async set(key, vector) {
      values.set(key, [...vector]);
    },
  };
}

function createProvider(embed: EmbeddingProvider['embed']): EmbeddingProvider {
  return {
    providerId: 'test-provider',
    modelId: 'test-model',
    modelRevision: 'revision-1',
    dimensions: 3,
    embed,
  };
}

describe('임베딩 제공자 계약', () => {
  it('유니코드와 공백을 정규화해 같은 입력에 같은 캐시 키를 만든다', () => {
    const base = {
      providerId: 'local-transformers',
      modelId: 'Xenova/multilingual-e5-small',
      modelRevision: 'revision-1',
      taskType: 'query' as const,
    };

    const composed = createEmbeddingCacheKey({
      ...base,
      text: '  cafe\u0301   검색\n자료  ',
    });
    const normalized = createEmbeddingCacheKey({
      ...base,
      text: 'café 검색 자료',
    });

    expect(normalizeEmbeddingInput('  cafe\u0301   검색\n자료  ')).toBe(
      'café 검색 자료'
    );
    expect(composed).toBe(normalized);
    expect(composed).toMatch(/^[a-f0-9]{64}$/u);
  });

  it('모델 리비전과 task type을 캐시 키에서 구분한다', () => {
    const base = {
      providerId: 'local-transformers',
      modelId: 'Xenova/multilingual-e5-small',
      modelRevision: 'revision-1',
      taskType: 'query' as const,
      text: '로그인 폼 검증',
    };

    expect(
      new Set([
        createEmbeddingCacheKey(base),
        createEmbeddingCacheKey({
          ...base,
          modelRevision: 'revision-2',
        }),
        createEmbeddingCacheKey({
          ...base,
          taskType: 'passage',
        }),
      ]).size
    ).toBe(3);
  });

  it('정규화된 동일 입력은 제공자를 한 번만 호출하고 캐시를 재사용한다', async () => {
    const embed = vi.fn(async () => [0.1, 0.2, 0.3]);
    const provider = createProvider(embed);
    const cache = createMemoryCache();

    const first = await embedWithCache({
      provider,
      cache,
      request: {
        text: '  로그인   폼 검증 ',
        taskType: 'query',
      },
    });
    const second = await embedWithCache({
      provider,
      cache,
      request: {
        text: '로그인 폼 검증',
        taskType: 'query',
      },
    });

    expect(first).toEqual([0.1, 0.2, 0.3]);
    expect(second).toEqual(first);
    expect(embed).toHaveBeenCalledOnce();
    expect(embed).toHaveBeenCalledWith({
      text: '로그인 폼 검증',
      taskType: 'query',
    });
  });

  it('벡터 차원과 유한한 숫자 여부를 검증한다', () => {
    expect(validateEmbeddingVector([0.1, 0.2, 0.3], 3)).toEqual([
      0.1, 0.2, 0.3,
    ]);
    expect(() => validateEmbeddingVector([0.1, 0.2], 3)).toThrow(/차원.*3.*2/u);
    expect(() => validateEmbeddingVector([0.1, Number.NaN, 0.3], 3)).toThrow(
      /유한한 숫자/u
    );
  });

  it('파일 캐시는 새 인스턴스에서도 벡터를 다시 읽는다', async () => {
    const cacheDirectory = await mkdtemp(
      join(tmpdir(), 'hub-embedding-cache-')
    );
    const cacheKey = 'a'.repeat(64);

    try {
      await createFileEmbeddingCache(cacheDirectory).set(
        cacheKey,
        [0.1, 0.2, 0.3]
      );

      await expect(
        createFileEmbeddingCache(cacheDirectory).get(cacheKey)
      ).resolves.toEqual([0.1, 0.2, 0.3]);
    } finally {
      await rm(cacheDirectory, { recursive: true });
    }
  });
});

describe('로컬 multilingual-e5 제공자', () => {
  it('Node 런타임에서 지원하는 CPU 장치로 q8 모델을 실행한다', () => {
    const provider = createLocalE5EmbeddingProvider({
      extractorFactory: async () => async () => ({
        data: Float32Array.from({ length: 384 }, () => 0),
      }),
    });

    expect(LOCAL_E5_RUNTIME_OPTIONS).toMatchObject({
      device: 'cpu',
      dtype: 'q8',
    });
    expect(provider.providerId).toBe('transformers-js@4.2.0:cpu:q8');
  });

  it('query와 passage에 서로 다른 E5 접두사를 붙이고 추출기를 재사용한다', async () => {
    const extractor = vi.fn(async () => ({
      data: Float32Array.from([0.1, 0.2, 0.3]),
    }));
    const extractorFactory = vi.fn(async () => extractor);
    const provider = createLocalE5EmbeddingProvider({
      dimensions: 3,
      extractorFactory,
    });

    const queryVector = await provider.embed({
      text: '  로그인   폼 검증 ',
      taskType: 'query',
    });
    const passageVector = await provider.embed({
      text: '폼 검증 자료',
      taskType: 'passage',
    });

    expect(queryVector).toEqual([
      expect.closeTo(0.1),
      expect.closeTo(0.2),
      expect.closeTo(0.3),
    ]);
    expect(passageVector).toEqual(queryVector);
    expect(extractorFactory).toHaveBeenCalledOnce();
    expect(extractor).toHaveBeenNthCalledWith(1, 'query: 로그인 폼 검증', {
      normalize: true,
      pooling: 'mean',
    });
    expect(extractor).toHaveBeenNthCalledWith(2, 'passage: 폼 검증 자료', {
      normalize: true,
      pooling: 'mean',
    });
  });

  it('추출기가 잘못된 차원의 벡터를 반환하면 거부한다', async () => {
    const provider = createLocalE5EmbeddingProvider({
      dimensions: 3,
      extractorFactory: async () => async () => ({
        data: Float32Array.from([0.1, 0.2]),
      }),
    });

    await expect(
      provider.embed({
        text: '로그인 폼 검증',
        taskType: 'query',
      })
    ).rejects.toThrow(/차원.*3.*2/u);
  });
});
