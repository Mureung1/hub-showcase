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

type InsightWorkspaceState = {
  insights: Insight[];
  loadWarnings: ReturnType<InsightRepository['load']>['warnings'];
  repository: InsightRepository;
};

export function useInsightWorkspace({
  createId = createInsightId,
  now = () => new Date().toISOString(),
  repository,
}: UseInsightWorkspaceOptions) {
  const [workspaceState, setWorkspaceState] = useState(() =>
    loadInsightWorkspace(repository)
  );
  let currentWorkspaceState = workspaceState;

  if (workspaceState.repository !== repository) {
    currentWorkspaceState = loadInsightWorkspace(repository);
    setWorkspaceState(currentWorkspaceState);
  }

  function saveInsight(rawUrl: string): SaveInsightResult {
    const normalizedUrl = normalizeInsightUrl(rawUrl);

    if (!normalizedUrl.ok) {
      return normalizedUrl;
    }

    if (
      currentWorkspaceState.insights.some(
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
    const nextInsights = [newInsight, ...currentWorkspaceState.insights];
    const saveResult = repository.save(nextInsights);

    if (!saveResult.ok) {
      return saveResult;
    }

    setWorkspaceState({
      ...currentWorkspaceState,
      insights: nextInsights,
      loadWarnings: currentWorkspaceState.loadWarnings.filter(
        (warning) => warning === 'read-failed'
      ),
    });
    return { ok: true };
  }

  return {
    insights: currentWorkspaceState.insights,
    loadWarnings: currentWorkspaceState.loadWarnings,
    saveInsight,
  };
}

function loadInsightWorkspace(
  repository: InsightRepository
): InsightWorkspaceState {
  const loadResult = repository.load();

  return {
    insights: loadResult.insights,
    loadWarnings: loadResult.warnings,
    repository,
  };
}

function createInsightId() {
  return crypto.randomUUID();
}
