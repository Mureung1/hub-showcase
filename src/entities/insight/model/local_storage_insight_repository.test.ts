import { describe, expect, it } from 'vitest';

import * as insightApi from '../index';
import type { Insight } from '../index';

const INSIGHT_STORAGE_KEY = 'amajda:insights';

const insight: Insight = {
  id: 'insight-1',
  originalUrl: 'https://www.example.com/articles/1?utm_source=test',
  normalizedUrl: 'https://www.example.com/articles/1',
  domain: 'example.com',
  title: 'Local-first architecture',
  titleOrigin: 'capture',
  memo: 'Keep the storage boundary replaceable.',
  categoryId: '10000000-0000-4000-8000-000000000001',
  createdAt: '2026-07-14T00:00:00.000Z',
  updatedAt: '2026-07-14T00:00:00.000Z',
};

class MemoryStorage implements Storage {
  private readonly entries: Map<string, string>;

  constructor(initialEntries: [string, string][] = []) {
    this.entries = new Map(initialEntries);
  }

  get length() {
    return this.entries.size;
  }

  clear() {
    this.entries.clear();
  }

  getItem(key: string) {
    return this.entries.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.entries.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.entries.delete(key);
  }

  setItem(key: string, value: string) {
    this.entries.set(key, value);
  }
}

class ThrowingGetStorage extends MemoryStorage {
  override getItem(): string | null {
    throw new Error('getItem failed');
  }
}

class ThrowingSetStorage extends MemoryStorage {
  override setItem() {
    throw new Error('setItem failed');
  }
}

describe('createLocalStorageInsightRepository', () => {
  it('빈 저장소를 비동기로 조회한다', async () => {
    const repository = insightApi.createLocalStorageInsightRepository(
      new MemoryStorage()
    );

    await expect(repository.list()).resolves.toEqual({
      insights: [],
      warnings: [],
    });
  });

  it('인사이트를 생성하고 스키마 버전 1 형식으로 복원한다', async () => {
    const storage = new MemoryStorage();
    const repository = insightApi.createLocalStorageInsightRepository(storage);

    await expect(repository.create(insight)).resolves.toEqual({
      insight,
      ok: true,
    });
    expect(JSON.parse(storage.getItem(INSIGHT_STORAGE_KEY) ?? 'null')).toEqual({
      schemaVersion: 1,
      insights: [insight],
    });
    await expect(repository.list()).resolves.toEqual({
      insights: [insight],
      warnings: [],
    });
  });

  it('손상된 항목과 중복 ID를 제외하고 정상 항목 순서를 유지한다', async () => {
    const laterInsight = createInsight({
      id: 'insight-2',
      originalUrl: 'https://later.example/notes/2',
      normalizedUrl: 'https://later.example/notes/2',
      domain: 'later.example',
      title: 'A later valid insight',
    });
    const storage = createStoredInsights([
      insight,
      { ...insight, id: 'invalid-title', title: '' },
      { ...insight, title: 'Later duplicate ID' },
      laterInsight,
    ]);
    const repository = insightApi.createLocalStorageInsightRepository(storage);

    await expect(repository.list()).resolves.toEqual({
      insights: [insight, laterInsight],
      warnings: ['corrupted-entry'],
    });
  });

  it.each([
    ['invalid JSON', '{'],
    ['null root', JSON.stringify(null)],
    ['unknown schema', JSON.stringify({ schemaVersion: 2, insights: [] })],
    ['invalid entries', JSON.stringify({ schemaVersion: 1, insights: null })],
  ])('손상된 저장소(%s)를 예외 없이 경고한다', async (_case, serialized) => {
    const storage = new MemoryStorage([[INSIGHT_STORAGE_KEY, serialized]]);
    const repository = insightApi.createLocalStorageInsightRepository(storage);

    await expect(repository.list()).resolves.toEqual({
      insights: [],
      warnings: ['corrupted-store'],
    });
  });

  it('같은 정규화 URL 생성을 거부하고 기존 저장소를 유지한다', async () => {
    const storage = createStoredInsights([insight]);
    const repository = insightApi.createLocalStorageInsightRepository(storage);
    const duplicate = createInsight({
      id: 'insight-2',
      originalUrl: 'https://www.example.com/articles/1#details',
      normalizedUrl: insight.normalizedUrl,
      domain: insight.domain,
    });

    await expect(repository.create(duplicate)).resolves.toEqual({
      ok: false,
      reason: 'duplicate',
    });
    await expect(repository.list()).resolves.toEqual({
      insights: [insight],
      warnings: [],
    });
  });

  it('인사이트를 수정하고 다른 항목 순서를 유지한다', async () => {
    const laterInsight = createInsight({
      id: 'insight-2',
      originalUrl: 'https://later.example/article',
      normalizedUrl: 'https://later.example/article',
      domain: 'later.example',
    });
    const storage = createStoredInsights([insight, laterInsight]);
    const repository = insightApi.createLocalStorageInsightRepository(storage);
    const updatedInsight = {
      ...insight,
      memo: '수정된 메모',
      updatedAt: '2026-07-15T00:00:00.000Z',
    };

    await expect(repository.update(updatedInsight)).resolves.toEqual({
      insight: updatedInsight,
      ok: true,
    });
    await expect(repository.list()).resolves.toEqual({
      insights: [updatedInsight, laterInsight],
      warnings: [],
    });
  });

  it('수정으로 다른 항목의 정규화 URL을 침범하지 못한다', async () => {
    const laterInsight = createInsight({
      id: 'insight-2',
      originalUrl: 'https://later.example/article',
      normalizedUrl: 'https://later.example/article',
      domain: 'later.example',
    });
    const storage = createStoredInsights([insight, laterInsight]);
    const repository = insightApi.createLocalStorageInsightRepository(storage);

    await expect(
      repository.update({
        ...insight,
        originalUrl: laterInsight.originalUrl,
        normalizedUrl: laterInsight.normalizedUrl,
        domain: laterInsight.domain,
      })
    ).resolves.toEqual({ ok: false, reason: 'duplicate' });
    await expect(repository.list()).resolves.toEqual({
      insights: [insight, laterInsight],
      warnings: [],
    });
  });

  it('인사이트를 삭제하고 재조회에서도 제외한다', async () => {
    const keptInsight = createInsight({
      id: 'insight-2',
      originalUrl: 'https://kept.example/article',
      normalizedUrl: 'https://kept.example/article',
      domain: 'kept.example',
    });
    const storage = createStoredInsights([insight, keptInsight]);
    const repository = insightApi.createLocalStorageInsightRepository(storage);

    await expect(repository.delete(insight.id)).resolves.toEqual({ ok: true });
    await expect(repository.list()).resolves.toEqual({
      insights: [keptInsight],
      warnings: [],
    });
  });

  it('일괄 삭제 대상을 모두 찾지 못하면 저장값을 바꾸지 않는다', async () => {
    const storage = new MemoryStorage();
    const repository = insightApi.createLocalStorageInsightRepository(storage);
    await repository.create(insight);

    await expect(
      repository.deleteMany([insight.id, 'missing'])
    ).resolves.toEqual({ ok: false, reason: 'not-found' });
    await expect(repository.list()).resolves.toMatchObject({
      insights: [insight],
    });
  });

  it.each(['update', 'delete'] as const)(
    '존재하지 않는 항목 %s를 not-found로 반환한다',
    async (operation) => {
      const repository = insightApi.createLocalStorageInsightRepository(
        createStoredInsights([insight])
      );
      const result =
        operation === 'update'
          ? repository.update(createInsight({ id: 'missing' }))
          : repository.delete('missing');

      await expect(result).resolves.toEqual({
        ok: false,
        reason: 'not-found',
      });
    }
  );

  it('읽기 실패를 경고하고 생성·수정·삭제를 쓰기 실패로 반환한다', async () => {
    const repository = insightApi.createLocalStorageInsightRepository(
      new ThrowingGetStorage()
    );

    await expect(repository.list()).resolves.toEqual({
      insights: [],
      warnings: ['read-failed'],
    });
    await expect(repository.create(insight)).resolves.toEqual({
      ok: false,
      reason: 'write-failed',
    });
    await expect(repository.update(insight)).resolves.toEqual({
      ok: false,
      reason: 'write-failed',
    });
    await expect(repository.delete(insight.id)).resolves.toEqual({
      ok: false,
      reason: 'write-failed',
    });
  });

  it('쓰기 실패 시 기존 저장소를 보존한다', async () => {
    const existingStore = JSON.stringify({
      schemaVersion: 1,
      insights: [insight],
    });
    const storage = new ThrowingSetStorage([
      [INSIGHT_STORAGE_KEY, existingStore],
    ]);
    const repository = insightApi.createLocalStorageInsightRepository(storage);

    await expect(
      repository.create(createInsight({ id: 'insight-2' }))
    ).resolves.toEqual({ ok: false, reason: 'write-failed' });
    expect(storage.getItem(INSIGHT_STORAGE_KEY)).toBe(existingStore);
  });
});

function createStoredInsights(insights: unknown[]) {
  return new MemoryStorage([
    [INSIGHT_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, insights })],
  ]);
}

function createInsight(overrides: Partial<Insight> = {}): Insight {
  return {
    ...insight,
    id: 'insight-2',
    originalUrl: 'https://new.example/article',
    normalizedUrl: 'https://new.example/article',
    domain: 'new.example',
    title: 'New insight',
    ...overrides,
  };
}
