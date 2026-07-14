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
  memo: 'Keep the storage boundary replaceable.',
  category: 'Development',
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

function loadSerializedStore(serializedStore: string) {
  const storage = new MemoryStorage();
  storage.setItem(INSIGHT_STORAGE_KEY, serializedStore);

  try {
    return insightApi.createLocalStorageInsightRepository(storage).load();
  } catch {
    return 'threw';
  }
}

describe('createLocalStorageInsightRepository', () => {
  it('loads an empty result from empty storage', () => {
    const repository = insightApi.createLocalStorageInsightRepository(
      new MemoryStorage()
    );

    expect(repository.load()).toEqual({ insights: [], warnings: [] });
  });

  it('saves schema version 1 and restores the exact insight', () => {
    const storage = new MemoryStorage();
    const repository = insightApi.createLocalStorageInsightRepository(storage);

    expect(repository.save([insight])).toEqual({ ok: true });
    expect(JSON.parse(storage.getItem(INSIGHT_STORAGE_KEY) ?? 'null')).toEqual({
      schemaVersion: 1,
      insights: [insight],
    });
    expect(
      insightApi.createLocalStorageInsightRepository(storage).load()
    ).toEqual({
      insights: [insight],
      warnings: [],
    });
  });

  it('keeps valid entries in order and warns once about corrupted entries', () => {
    const storage = new MemoryStorage();
    const nullableInsight: Insight = {
      ...insight,
      id: 'insight-2',
      memo: null,
      category: null,
    };
    const requiredStringFields = [
      'id',
      'originalUrl',
      'normalizedUrl',
      'domain',
      'title',
      'createdAt',
      'updatedAt',
    ] as const;
    const invalidEntries = [
      ...requiredStringFields.map((field) => ({
        ...insight,
        id: `invalid-${field}`,
        [field]: null,
      })),
      { ...insight, id: 'invalid-memo', memo: 42 },
      { ...insight, id: 'invalid-category', category: 42 },
      null,
    ];
    storage.setItem(
      INSIGHT_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        insights: [
          insight,
          invalidEntries[0],
          nullableInsight,
          ...invalidEntries.slice(1),
        ],
      })
    );

    expect(
      insightApi.createLocalStorageInsightRepository(storage).load()
    ).toEqual({
      insights: [insight, nullableInsight],
      warnings: ['corrupted-entry'],
    });
  });

  it('isolates semantically corrupted entries and preserves valid neighbors', () => {
    const storage = new MemoryStorage();
    const laterInsight: Insight = {
      ...insight,
      id: 'insight-2',
      originalUrl: 'https://later.example/notes/2',
      normalizedUrl: 'https://later.example/notes/2',
      domain: 'later.example',
      title: 'A later valid insight',
      createdAt: '2026-07-15T00:00:00.000Z',
      updatedAt: '2026-07-15T01:00:00.000Z',
    };
    const invalidEntries = [
      {
        ...insight,
        id: 'invalid-original-url',
        originalUrl: 'javascript:alert(1)',
      },
      {
        ...insight,
        id: 'invalid-normalized-url',
        normalizedUrl: 'https://example.com/a-different-article',
      },
      { ...insight, id: 'invalid-domain', domain: 'different.example' },
      { ...insight, id: '   ' },
      { ...insight, id: 'invalid-title', title: '' },
      { ...insight, id: 'empty-domain', domain: '   ' },
      { ...insight, id: 'invalid-created-at', createdAt: 'not-a-timestamp' },
      { ...insight, id: 'invalid-updated-at', updatedAt: '2026/07/14' },
      {
        ...insight,
        id: 'updated-before-created',
        createdAt: '2026-07-15T00:00:00.000Z',
        updatedAt: '2026-07-14T00:00:00.000Z',
      },
    ];
    storage.setItem(
      INSIGHT_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        insights: [insight, ...invalidEntries, laterInsight],
      })
    );

    expect(
      insightApi.createLocalStorageInsightRepository(storage).load()
    ).toEqual({
      insights: [insight, laterInsight],
      warnings: ['corrupted-entry'],
    });
  });

  it('validates leap days across century and years below 100', () => {
    const yearZeroLeapDay: Insight = {
      ...insight,
      id: 'year-zero-leap-day',
      createdAt: '0000-02-29T00:00:00.000Z',
      updatedAt: '0000-02-29T00:00:00.000Z',
    };
    const leapCentury: Insight = {
      ...insight,
      id: 'leap-century',
      createdAt: '2000-02-29T00:00:00.000Z',
      updatedAt: '2000-02-29T00:00:00.000Z',
    };
    const nonLeapCentury: Insight = {
      ...insight,
      id: 'non-leap-century',
      createdAt: '1900-02-29T00:00:00.000Z',
      updatedAt: '1900-02-29T00:00:00.000Z',
    };
    const storage = new MemoryStorage();

    storage.setItem(
      INSIGHT_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        insights: [yearZeroLeapDay, nonLeapCentury, leapCentury],
      })
    );

    expect(
      insightApi.createLocalStorageInsightRepository(storage).load()
    ).toEqual({
      insights: [yearZeroLeapDay, leapCentury],
      warnings: ['corrupted-entry'],
    });
  });

  it('keeps the first valid insight and isolates later duplicate IDs', () => {
    const storage = new MemoryStorage();
    const duplicateIdInsight: Insight = {
      ...insight,
      originalUrl: 'https://duplicate.example/articles/2',
      normalizedUrl: 'https://duplicate.example/articles/2',
      domain: 'duplicate.example',
      title: 'Later duplicate ID',
    };
    const laterInsight: Insight = {
      ...insight,
      id: 'insight-2',
      originalUrl: 'https://later.example/articles/3',
      normalizedUrl: 'https://later.example/articles/3',
      domain: 'later.example',
      title: 'Later unique ID',
    };
    storage.setItem(
      INSIGHT_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        insights: [insight, duplicateIdInsight, laterInsight],
      })
    );

    expect(
      insightApi.createLocalStorageInsightRepository(storage).load()
    ).toEqual({
      insights: [insight, laterInsight],
      warnings: ['corrupted-entry'],
    });
  });

  it('returns a corrupted-store warning for invalid JSON without throwing', () => {
    expect(loadSerializedStore('{')).toEqual({
      insights: [],
      warnings: ['corrupted-store'],
    });
  });

  it('returns a corrupted-store warning for non-object roots', () => {
    const results = [null, [], 'store', 1].map((root) => {
      return loadSerializedStore(JSON.stringify(root));
    });

    expect(results).toEqual(
      Array.from({ length: 4 }, () => ({
        insights: [],
        warnings: ['corrupted-store'],
      }))
    );
  });

  it('returns a corrupted-store warning for missing or unknown schema versions', () => {
    const stores = [
      { insights: [] },
      { schemaVersion: 2, insights: [] },
      { schemaVersion: '1', insights: [] },
    ];

    expect(
      stores.map((store) => loadSerializedStore(JSON.stringify(store)))
    ).toEqual(
      Array.from({ length: stores.length }, () => ({
        insights: [],
        warnings: ['corrupted-store'],
      }))
    );
  });

  it('returns a corrupted-store warning when insights is not an array', () => {
    const stores = [
      { schemaVersion: 1 },
      { schemaVersion: 1, insights: null },
      { schemaVersion: 1, insights: {} },
      { schemaVersion: 1, insights: 'not-an-array' },
    ];

    expect(
      stores.map((store) => loadSerializedStore(JSON.stringify(store)))
    ).toEqual(
      Array.from({ length: stores.length }, () => ({
        insights: [],
        warnings: ['corrupted-store'],
      }))
    );
  });

  it('returns a read-failed warning when getItem throws', () => {
    let result: unknown;

    try {
      result = insightApi
        .createLocalStorageInsightRepository(new ThrowingGetStorage())
        .load();
    } catch {
      result = 'threw';
    }

    expect(result).toEqual({
      insights: [],
      warnings: ['read-failed'],
    });
  });

  it('returns write-failed and preserves storage when setItem throws', () => {
    const existingStore = JSON.stringify({
      schemaVersion: 1,
      insights: [],
    });
    const storage = new ThrowingSetStorage([
      [INSIGHT_STORAGE_KEY, existingStore],
    ]);
    const repository = insightApi.createLocalStorageInsightRepository(storage);
    let result: unknown;

    try {
      result = repository.save([insight]);
    } catch {
      result = 'threw';
    }

    expect(result).toEqual({ ok: false, reason: 'write-failed' });
    expect(storage.getItem(INSIGHT_STORAGE_KEY)).toBe(existingStore);
  });
});
