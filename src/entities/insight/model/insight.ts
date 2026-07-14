import type { CategoryTone } from '@/shared/ui';

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

export function filterInsights(
  insights: Insight[],
  category: string,
  query: string
) {
  const queryTokens = Array.from(
    new Set(query.trim().toLowerCase().split(/\s+/).filter(Boolean))
  );

  return insights
    .map((insight, index) => {
      const matchesCategory =
        category === 'All' ||
        (category === '미분류' && insight.category === null) ||
        insight.category === category;
      const haystack = [
        insight.title,
        insight.domain,
        insight.memo ?? '',
        insight.category ?? '',
      ]
        .join(' ')
        .toLowerCase();
      const score = queryTokens.reduce(
        (total, token) => total + (haystack.includes(token) ? 1 : 0),
        0
      );

      return { index, insight, matchesCategory, score };
    })
    .filter(({ matchesCategory, score }) => {
      return matchesCategory && (queryTokens.length === 0 || score > 0);
    })
    .sort((current, next) => {
      if (queryTokens.length === 0) {
        return current.index - next.index;
      }

      return next.score - current.score || current.index - next.index;
    })
    .map(({ insight }) => insight);
}
