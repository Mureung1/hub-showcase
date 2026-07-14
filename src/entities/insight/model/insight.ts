import type { CategoryTone } from '@/shared/ui';

import { searchInsights } from './search_insights';

export type InsightCategory = {
  name: string;
  tone: CategoryTone;
};

export type Insight = {
  id: string;
  originalUrl: string;
  normalizedUrl: string;
  domain: string;
  title: string;
  memo: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InsightContextInput = {
  category: string;
  memo: string;
  title: string;
};

export type InsightMutationResult =
  { ok: true } | { ok: false; reason: 'not-found' | 'write-failed' };

export function filterInsights(
  insights: Insight[],
  category: string,
  query: string
) {
  const categoryInsights = insights.filter((insight) => {
    return (
      category === 'All' ||
      (category === '미분류' && insight.category === null) ||
      insight.category === category
    );
  });

  if (query.trim().length === 0) {
    return categoryInsights;
  }

  return searchInsights(categoryInsights, query).map(({ insight }) => insight);
}
