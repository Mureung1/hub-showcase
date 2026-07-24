import { searchInsights, type SearchInsightsOptions } from './search_insights';
import type { InsightTitleOrigin } from './insight_capture';

export type { InsightTitleOrigin } from './insight_capture';

export type Insight = {
  id: string;
  originalUrl: string;
  normalizedUrl: string;
  domain: string;
  title: string;
  titleOrigin: InsightTitleOrigin;
  memo: string | null;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InsightContextInput = {
  categoryId: string | null;
  memo: string;
  title: string;
};

export type InsightMutationResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'not-found' | 'permission-denied' | 'write-failed';
    };

export function filterInsights(
  insights: Insight[],
  categoryFilter: string,
  query: string,
  searchOptions?: SearchInsightsOptions
) {
  const categoryInsights = insights.filter((insight) => {
    return (
      categoryFilter === 'all' ||
      (categoryFilter === 'uncategorized' && insight.categoryId === null) ||
      insight.categoryId === categoryFilter
    );
  });

  if (query.trim().length === 0) {
    return categoryInsights;
  }

  return searchInsights(categoryInsights, query, searchOptions).map(
    ({ insight }) => insight
  );
}
