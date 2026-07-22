import { useCallback, useEffect, useState } from 'react';
import { fetchMeals } from '../services/mealsApi';
import { ApiError } from '../services/api';
import type { MealLog } from '../types/meal';

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

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { meals: fetched } = await fetchMeals({ limit: 50 });
      setMeals(fetched);
    } catch (err) {
      setMeals([]);
      setError(formatLoadError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { meals, loading, error, refresh };
}
