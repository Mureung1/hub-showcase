import type { Insight } from './insight';

export type InsightRepositoryWarning = 'corrupted-entry' | 'corrupted-store';

export type InsightRepositoryLoadResult = {
  insights: Insight[];
  warnings: InsightRepositoryWarning[];
};

export type InsightRepositorySaveResult =
  { ok: true } | { ok: false; reason: 'write-failed' };

export type InsightRepository = {
  load(): InsightRepositoryLoadResult;
  save(insights: Insight[]): InsightRepositorySaveResult;
};
