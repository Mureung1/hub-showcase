import { useCallback, useEffect, useRef, useState } from 'react';

import {
  normalizeInsightUrl,
  type Insight,
  type InsightContextInput,
  type InsightMutationResult,
  type InsightRepository,
  type InsightRepositoryWarning,
} from '@/entities/insight';

export type SaveInsightFailureReason =
  | 'duplicate'
  | 'invalid-url'
  | 'permission-denied'
  | 'unsupported-protocol'
  | 'write-failed';

export type SaveInsightResult =
  | { ok: true; insightId: string }
  | {
      ok: false;
      reason: SaveInsightFailureReason;
    };

export type UpdateInsightContextResult = InsightMutationResult;

export type DeleteInsightResult = InsightMutationResult;

export type UseInsightWorkspaceOptions = {
  createId?: () => string;
  now?: () => string;
  repository: InsightRepository;
};

type InsightWorkspaceState = {
  insights: Insight[];
  loadWarnings: InsightRepositoryWarning[];
  repository: InsightRepository;
  status: 'loading' | 'ready';
};

export function useInsightWorkspace({
  createId = createInsightId,
  now = () => new Date().toISOString(),
  repository,
}: UseInsightWorkspaceOptions) {
  const [workspaceState, setWorkspaceState] = useState<InsightWorkspaceState>(
    () => createLoadingState(repository)
  );
  const [isMutating, setIsMutating] = useState(false);
  const workspaceStateRef = useRef(workspaceState);
  const mutationInFlightRef = useRef(false);

  useEffect(() => {
    let active = true;
    const loadingState = createLoadingState(repository);

    workspaceStateRef.current = loadingState;

    void repository.list().then((loadResult) => {
      if (!active) {
        return;
      }

      const readyState: InsightWorkspaceState = {
        insights: loadResult.insights,
        loadWarnings: loadResult.warnings,
        repository,
        status: 'ready',
      };
      workspaceStateRef.current = readyState;
      setWorkspaceState(readyState);
    });

    return () => {
      active = false;
    };
  }, [repository]);

  const runMutation = useCallback(
    async <T>(command: () => Promise<T>, failure: T): Promise<T> => {
      const currentState = workspaceStateRef.current;

      if (
        currentState.repository !== repository ||
        currentState.status !== 'ready' ||
        mutationInFlightRef.current
      ) {
        return failure;
      }

      mutationInFlightRef.current = true;
      setIsMutating(true);

      try {
        return await command();
      } finally {
        mutationInFlightRef.current = false;
        setIsMutating(false);
      }
    },
    [repository]
  );

  const saveInsight = useCallback(
    async (rawUrl: string): Promise<SaveInsightResult> => {
      const normalizedUrl = normalizeInsightUrl(rawUrl);

      if (!normalizedUrl.ok) {
        return normalizedUrl;
      }

      return runMutation<SaveInsightResult>(
        async () => {
          const currentState = workspaceStateRef.current;

          if (
            currentState.insights.some(
              (insight) => insight.normalizedUrl === normalizedUrl.normalizedUrl
            )
          ) {
            return { ok: false, reason: 'duplicate' };
          }

          const savedAt = now();
          const candidate: Insight = {
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
          const createResult = await repository.create(candidate);

          if (!createResult.ok) {
            return {
              ok: false,
              reason:
                createResult.reason === 'duplicate' ||
                createResult.reason === 'permission-denied'
                  ? createResult.reason
                  : 'write-failed',
            };
          }

          updateReadyState(repository, setWorkspaceState, workspaceStateRef, {
            insights: [createResult.insight, ...currentState.insights],
            loadWarnings: clearRecoverableWarnings(currentState.loadWarnings),
          });
          return { ok: true, insightId: createResult.insight.id };
        },
        { ok: false, reason: 'write-failed' }
      );
    },
    [createId, now, repository, runMutation]
  );

  const updateInsightContext = useCallback(
    async (
      insightId: string,
      context: InsightContextInput
    ): Promise<UpdateInsightContextResult> =>
      runMutation<UpdateInsightContextResult>(
        async () => {
          const currentState = workspaceStateRef.current;
          const insightIndex = currentState.insights.findIndex(
            (candidate) => candidate.id === insightId
          );
          const insight = currentState.insights[insightIndex];

          if (!insight) {
            return { ok: false, reason: 'not-found' };
          }

          const candidate: Insight = {
            ...insight,
            category: normalizeOptionalCategory(context.category),
            memo: normalizeOptionalText(context.memo),
            title:
              normalizeOptionalText(context.title) ?? getFallbackTitle(insight),
            updatedAt: getNextUpdatedAt(insight, now()),
          };
          const updateResult = await repository.update(candidate);

          if (!updateResult.ok) {
            return {
              ok: false,
              reason:
                updateResult.reason === 'not-found' ||
                updateResult.reason === 'permission-denied'
                  ? updateResult.reason
                  : 'write-failed',
            };
          }

          const nextInsights = [...currentState.insights];
          nextInsights[insightIndex] = updateResult.insight;
          updateReadyState(repository, setWorkspaceState, workspaceStateRef, {
            insights: nextInsights,
            loadWarnings: clearRecoverableWarnings(currentState.loadWarnings),
          });
          return { ok: true };
        },
        { ok: false, reason: 'write-failed' }
      ),
    [now, repository, runMutation]
  );

  const deleteInsight = useCallback(
    async (insightId: string): Promise<DeleteInsightResult> =>
      runMutation<DeleteInsightResult>(
        async () => {
          const currentState = workspaceStateRef.current;
          const insightIndex = currentState.insights.findIndex(
            (candidate) => candidate.id === insightId
          );

          if (insightIndex === -1) {
            return { ok: false, reason: 'not-found' };
          }

          const deleteResult = await repository.delete(insightId);

          if (!deleteResult.ok) {
            return deleteResult;
          }

          const nextInsights = [...currentState.insights];
          nextInsights.splice(insightIndex, 1);
          updateReadyState(repository, setWorkspaceState, workspaceStateRef, {
            insights: nextInsights,
            loadWarnings: clearRecoverableWarnings(currentState.loadWarnings),
          });
          return { ok: true };
        },
        { ok: false, reason: 'write-failed' }
      ),
    [repository, runMutation]
  );

  const isCurrentRepository = workspaceState.repository === repository;

  return {
    deleteInsight,
    insights: isCurrentRepository ? workspaceState.insights : [],
    isLoading: !isCurrentRepository || workspaceState.status === 'loading',
    isMutating,
    loadWarnings: isCurrentRepository ? workspaceState.loadWarnings : [],
    saveInsight,
    updateInsightContext,
  };
}

function createLoadingState(
  repository: InsightRepository
): InsightWorkspaceState {
  return {
    insights: [],
    loadWarnings: [],
    repository,
    status: 'loading',
  };
}

function updateReadyState(
  repository: InsightRepository,
  setWorkspaceState: React.Dispatch<
    React.SetStateAction<InsightWorkspaceState>
  >,
  workspaceStateRef: React.MutableRefObject<InsightWorkspaceState>,
  values: Pick<InsightWorkspaceState, 'insights' | 'loadWarnings'>
) {
  if (workspaceStateRef.current.repository !== repository) {
    return;
  }

  const nextState: InsightWorkspaceState = {
    ...workspaceStateRef.current,
    ...values,
    status: 'ready',
  };
  workspaceStateRef.current = nextState;
  setWorkspaceState(nextState);
}

function clearRecoverableWarnings(warnings: InsightRepositoryWarning[]) {
  return warnings.filter(
    (warning) => warning === 'read-failed' || warning === 'permission-denied'
  );
}

function createInsightId() {
  return crypto.randomUUID();
}

function normalizeOptionalText(value: string) {
  return value.trim() || null;
}

function normalizeOptionalCategory(value: string) {
  return value.trim().replace(/\s+/g, ' ') || null;
}

function getFallbackTitle(insight: Insight) {
  return insight.domain || insight.originalUrl;
}

function getNextUpdatedAt(insight: Insight, currentTime: string) {
  const createdAt = Date.parse(insight.createdAt);
  const previousUpdatedAt = Date.parse(insight.updatedAt);
  const currentTimestamp = Date.parse(currentTime);
  const nextTimestamp = Math.max(
    Number.isFinite(createdAt) ? createdAt : Number.NEGATIVE_INFINITY,
    Number.isFinite(previousUpdatedAt)
      ? previousUpdatedAt + 1
      : Number.NEGATIVE_INFINITY,
    Number.isFinite(currentTimestamp)
      ? currentTimestamp
      : Number.NEGATIVE_INFINITY
  );

  return new Date(nextTimestamp).toISOString();
}
