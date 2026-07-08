import type { AppData } from '../types';
import { createSeedData } from './seed';

const STORAGE_KEY = 'fitcheck-trainer-data';

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as AppData;
    }
  } catch {
    // corrupted data — fall through to seed
  }
  return createSeedData();
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
