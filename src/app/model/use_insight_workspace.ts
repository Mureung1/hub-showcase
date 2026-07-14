import { useState } from 'react';

import {
  normalizeInsightUrl,
  type Insight,
  type InsightRepository,
} from '@/entities/insight';

export type SaveInsightFailureReason =
  'duplicate' | 'invalid-url' | 'unsupported-protocol' | 'write-failed';

export type SaveInsightResult =
  | { ok: true }
  | {
      ok: false;
      reason: SaveInsightFailureReason;
    };

export type UseInsightWorkspaceOptions = {
  createId?: () => string;
  now?: () => string;
  repository: InsightRepository;
};

export function useInsightWorkspace({
  createId = createInsightId,
  now = () => new Date().toISOString(),
  repository,
}: UseInsightWorkspaceOptions) {
  const [loadResult] = useState(() => repository.load());
  const [insights, setInsights] = useState(loadResult.insights);

  function saveInsight(rawUrl: string): SaveInsightResult {
    const normalizedUrl = normalizeInsightUrl(rawUrl);

    if (!normalizedUrl.ok) {
      return normalizedUrl;
    }

    if (
      insights.some(
        (insight) => insight.normalizedUrl === normalizedUrl.normalizedUrl
      )
    ) {
      return { ok: false, reason: 'duplicate' };
    }

    const savedAt = now();
    const newInsight: Insight = {
      id: createId(),
      originalUrl: normalizedUrl.originalUrl,
      normalizedUrl: normalizedUrl.normalizedUrl,
      domain: normalizedUrl.domain,
      title: normalizedUrl.domain || normalizedUrl.originalUrl,
      memo: null,
      category: null,
      createdAt: savedAt,
      updatedAt: savedAt,
    };
    const nextInsights = [newInsight, ...insights];
    const saveResult = repository.save(nextInsights);

    if (!saveResult.ok) {
      return saveResult;
    }

    setInsights(nextInsights);
    return { ok: true };
  }

  return {
    insights,
    loadWarnings: loadResult.warnings,
    saveInsight,
  };
}

function createInsightId() {
  return crypto.randomUUID();
}
