import type { Insight } from './insight';

export const INSIGHT_SEARCH_FIELD_WEIGHTS = {
  memo: 4,
  title: 3,
  category: 2,
  domain: 1,
  originalUrl: 0.5,
} as const;

export const INSIGHT_SEARCH_MATCH_MULTIPLIERS = {
  exact: 3,
  prefix: 2,
  substring: 1,
} as const;

export type InsightSearchField = keyof typeof INSIGHT_SEARCH_FIELD_WEIGHTS;

export type InsightSearchResult = {
  insight: Insight;
  matchedFields: InsightSearchField[];
  matchedTokens: string[];
  score: number;
};

const SEARCH_FIELDS = Object.keys(
  INSIGHT_SEARCH_FIELD_WEIGHTS
) as InsightSearchField[];

export function searchInsights(
  insights: readonly Insight[],
  query: string
): InsightSearchResult[] {
  const queryTokens = Array.from(new Set(tokenize(query)));

  if (queryTokens.length === 0) {
    return [];
  }

  return insights
    .map((insight) => scoreInsight(insight, queryTokens))
    .filter((result) => result.score > 0)
    .sort(compareSearchResults);
}

function scoreInsight(
  insight: Insight,
  queryTokens: string[]
): InsightSearchResult {
  const matchedFields: InsightSearchField[] = [];
  const matchedTokenSet = new Set<string>();
  let score = 0;

  for (const field of SEARCH_FIELDS) {
    const fieldValue = insight[field] ?? '';
    const normalizedField = normalizeSearchText(fieldValue);
    const fieldTokens = tokenize(fieldValue);
    let fieldMatched = false;

    for (const queryToken of queryTokens) {
      const matchMultiplier = getMatchMultiplier(
        fieldTokens,
        normalizedField,
        queryToken
      );

      if (matchMultiplier === 0) {
        continue;
      }

      score += INSIGHT_SEARCH_FIELD_WEIGHTS[field] * matchMultiplier;
      fieldMatched = true;

      matchedTokenSet.add(queryToken);
    }

    if (fieldMatched) {
      matchedFields.push(field);
    }
  }

  const matchedTokens = queryTokens.filter((token) =>
    matchedTokenSet.has(token)
  );

  return { insight, matchedFields, matchedTokens, score };
}

function getMatchMultiplier(
  fieldTokens: string[],
  normalizedField: string,
  queryToken: string
) {
  if (fieldTokens.includes(queryToken)) {
    return INSIGHT_SEARCH_MATCH_MULTIPLIERS.exact;
  }

  if (fieldTokens.some((fieldToken) => fieldToken.startsWith(queryToken))) {
    return INSIGHT_SEARCH_MATCH_MULTIPLIERS.prefix;
  }

  return normalizedField.includes(queryToken)
    ? INSIGHT_SEARCH_MATCH_MULTIPLIERS.substring
    : 0;
}

function compareSearchResults(
  current: InsightSearchResult,
  next: InsightSearchResult
) {
  return (
    next.score - current.score ||
    compareCreatedAtDescending(current.insight, next.insight) ||
    compareText(current.insight.id, next.insight.id)
  );
}

function compareCreatedAtDescending(current: Insight, next: Insight) {
  const currentEpoch = getSortableEpoch(current.createdAt);
  const nextEpoch = getSortableEpoch(next.createdAt);

  if (currentEpoch === nextEpoch) {
    return 0;
  }

  return nextEpoch - currentEpoch;
}

function getSortableEpoch(value: string) {
  const epoch = Date.parse(value);

  return Number.isFinite(epoch) ? epoch : Number.NEGATIVE_INFINITY;
}

function compareText(current: string, next: string) {
  if (current === next) {
    return 0;
  }

  return current < next ? -1 : 1;
}

function tokenize(value: string) {
  return normalizeSearchText(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function normalizeSearchText(value: string) {
  return value.normalize('NFKC').toLowerCase().trim();
}
