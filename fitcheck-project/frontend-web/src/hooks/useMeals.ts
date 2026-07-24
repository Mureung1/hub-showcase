import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchMeals } from '../services/mealsApi';
import { ApiError } from '../services/api';
import type { MealLog } from '../types/meal';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_MS = 90_000;

function formatLoadError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 502 || err.status === 503) {
      return '백엔드 서버(localhost:5001)가 실행 중인지 확인해 주세요.';
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return '식단을 불러오지 못했습니다.';
}

function hasPendingAiAnalysis(meals: MealLog[]): boolean {
  return meals.some((meal) => meal.aiAnalysisPending);
}

export function useMeals(date?: string) {
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { meals: fetched } = await fetchMeals({
        date,
        limit: 50,
      });
      setMeals(fetched);
    } catch (err) {
      setMeals([]);
      setError(formatLoadError(err));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { meals, loading, error, refresh };
}

/** Recent meals for timeline; today's stats derived client-side. */
export function useMealTimeline() {
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollStartedAt = useRef<number | null>(null);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const { meals: fetched } = await fetchMeals({ limit: 50 });
      setMeals(fetched);
      if (!silent) setError(null);
    } catch (err) {
      if (!silent) {
        setMeals([]);
        setError(formatLoadError(err));
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!hasPendingAiAnalysis(meals)) {
      pollStartedAt.current = null;
      return;
    }

    if (pollStartedAt.current === null) {
      pollStartedAt.current = Date.now();
    }

    const tick = () => {
      const startedAt = pollStartedAt.current;
      if (startedAt !== null && Date.now() - startedAt >= MAX_POLL_MS) {
        pollStartedAt.current = null;
        return;
      }
      void refresh({ silent: true });
    };

    const intervalId = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [meals, refresh]);

  return { meals, loading, error, refresh };
}
