import { useCallback, useEffect, useRef, useState } from 'react';

import type { Insight } from '@/entities/insight';

import type {
  RetrieveFailureReason,
  RetrieveResult,
  RetrieveService,
} from './retrieve';

type RetrieveState = {
  errorReason?: RetrieveFailureReason;
  isRetrieving: boolean;
  pendingCount: number;
  results: Insight[];
  submittedQuery: string;
};

const INITIAL_STATE: RetrieveState = {
  isRetrieving: false,
  pendingCount: 0,
  results: [],
  submittedQuery: '',
};

export function useRetrieve(
  insights: readonly Insight[],
  service: RetrieveService
) {
  const [state, setState] = useState<RetrieveState>(INITIAL_STATE);
  const insightsRef = useRef(insights);
  const requestRevisionRef = useRef(0);

  useEffect(() => {
    insightsRef.current = insights;
  }, [insights]);

  const retrieve = useCallback(
    async (query: string): Promise<RetrieveResult> => {
      const requestRevision = requestRevisionRef.current + 1;
      requestRevisionRef.current = requestRevision;
      setState((current) => ({
        ...current,
        errorReason: undefined,
        isRetrieving: true,
      }));

      const result = await service.retrieve(query.trim());

      if (requestRevision !== requestRevisionRef.current) {
        return result;
      }

      if (!result.ok) {
        setState((current) => ({
          ...current,
          errorReason: result.reason,
          isRetrieving: false,
        }));
        return result;
      }

      const insightById = new Map(
        insightsRef.current.map((insight) => [insight.id, insight])
      );
      const results = result.insightIds.flatMap((id) => {
        const insight = insightById.get(id);
        return insight ? [insight] : [];
      });

      setState({
        isRetrieving: false,
        pendingCount: result.pendingCount,
        results,
        submittedQuery: query.trim(),
      });

      return result;
    },
    [service]
  );

  const clear = useCallback(() => {
    requestRevisionRef.current += 1;
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    clear,
    retrieve,
  };
}
