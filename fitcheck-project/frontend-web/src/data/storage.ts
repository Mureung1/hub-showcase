import type { AppData } from '../types';
import { createSeedData } from './seed';

const STORAGE_KEY = 'fitcheck-trainer-data';

export function loadData(): AppData {
  const seed = createSeedData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppData>;
      return {
        ...seed,
        ...parsed,
        workoutHistory:
          parsed.workoutHistory && parsed.workoutHistory.length > 0
            ? parsed.workoutHistory
            : seed.workoutHistory,
      };
    }
  } catch {
    // corrupted data — fall through to seed
  }
  return seed;
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
