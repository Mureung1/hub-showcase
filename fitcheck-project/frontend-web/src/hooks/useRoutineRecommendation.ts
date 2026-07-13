import { useCallback, useEffect, useState } from 'react';
import {
  fetchRoutineRecommendation,
  checkOllamaAvailable,
} from '../services/ollama';
import type { RoutineRecommendationResult } from '../utils/recommendation';
import type { MemberWithStatus } from '../types';
import type { AppData } from '../types';

interface UseRoutineRecommendationResult {
  recommendation: RoutineRecommendationResult | null;
  loading: boolean;
  ollamaOnline: boolean | null;
  refresh: () => void;
}

export function useRoutineRecommendation(
  member: MemberWithStatus | undefined,
  data: AppData,
): UseRoutineRecommendationResult {
  const [recommendation, setRecommendation] =
    useState<RoutineRecommendationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!member) {
      setRecommendation(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      const online = await checkOllamaAvailable();
      if (!cancelled) setOllamaOnline(online);

      const result = await fetchRoutineRecommendation(
        member!.name,
        member!.goal,
        data.workoutHistory,
        member!.id,
        data.routines[member!.id] ?? [],
      );

      if (!cancelled) {
        setRecommendation(result);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [member?.id, member?.name, member?.goal, data.workoutHistory, data.routines, refreshKey]);

  return { recommendation, loading, ollamaOnline, refresh };
}
