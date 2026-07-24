import { describe, expect, it, vi } from 'vitest';

import type { Insight, InsightRepository } from '@/entities/insight';

import { createRepositoryInsightCaptureService } from './create_repository_insight_capture_service';

describe('createRepositoryInsightCaptureService', () => {
  it('uses the common capture result for an existing normalized URL', async () => {
    const existingInsight = createInsight();
    const repository = createRepository({
      list: vi.fn().mockResolvedValue({
        insights: [existingInsight],
        warnings: [],
      }),
    });
    const service = createRepositoryInsightCaptureService(repository);

    await expect(
      service.capture({
        source: 'web',
        url: 'https://EXAMPLE.com/article?utm_source=campaign',
      })
    ).resolves.toEqual({ created: false, insight: existingInsight, ok: true });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('maps an invalid URL before attempting an injected repository write', async () => {
    const repository = createRepository();
    const service = createRepositoryInsightCaptureService(repository);

    await expect(
      service.capture({ source: 'web', url: 'javascript:alert(1)' })
    ).resolves.toEqual({ ok: false, reason: 'unsupported-protocol' });
    expect(repository.list).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });
});

function createRepository(
  overrides: Partial<InsightRepository> = {}
): InsightRepository {
  return {
    create: vi.fn(async (insight) => ({ insight, ok: true as const })),
    delete: vi.fn(async () => ({ ok: true as const })),
    list: vi.fn(async () => ({ insights: [], warnings: [] })),
    update: vi.fn(async (insight) => ({ insight, ok: true as const })),
    ...overrides,
  };
}

function createInsight(): Insight {
  return {
    categoryId: null,
    createdAt: '2026-07-16T00:00:00.000Z',
    domain: 'example.com',
    id: '10000000-0000-4000-8000-000000000001',
    memo: null,
    normalizedUrl: 'https://example.com/article',
    originalUrl: 'https://example.com/article',
    title: 'example.com',
    titleOrigin: 'fallback',
    updatedAt: '2026-07-16T00:00:00.000Z',
  };
}
