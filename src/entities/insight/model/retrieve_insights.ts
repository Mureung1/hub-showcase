import type { Insight } from './insight';
import { searchInsights, type InsightSearchResult } from './search_insights';

export type RetrievedInsight = InsightSearchResult;

export function retrieveInsights(
  insights: readonly Insight[],
  query: string
): RetrievedInsight[] {
  return searchInsights(insights, query).slice(0, 6);
}
