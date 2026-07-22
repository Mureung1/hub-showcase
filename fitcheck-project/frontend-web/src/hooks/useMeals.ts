import { useCallback, useEffect, useState } from 'react';
import { fetchMeals } from '../services/mealsApi';
import type { MealLog } from '../types/meal';

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
      setError(err instanceof Error ? err.message : '식단을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { meals, loading, error, refresh };
}
