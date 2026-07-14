import {
  createLocalStorageInsightRepository,
  type InsightRepository,
} from '@/entities/insight';

export function createBrowserInsightRepository(): InsightRepository {
  if (typeof window === 'undefined') {
    return createUnavailableInsightRepository();
  }

  try {
    return createLocalStorageInsightRepository(window.localStorage);
  } catch {
    return createUnavailableInsightRepository();
  }
}

function createUnavailableInsightRepository(): InsightRepository {
  return {
    load: () => ({ insights: [], warnings: ['read-failed'] }),
    save: () => ({ ok: false, reason: 'write-failed' }),
  };
}
