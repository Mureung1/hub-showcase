import type { Insight } from './insight';
import { searchInsights, type InsightSearchResult } from './search_insights';

export type RetrievedInsight = InsightSearchResult & {
  connectionClue: string;
};

export function retrieveInsights(
  insights: readonly Insight[],
  query: string
): RetrievedInsight[] {
  return searchInsights(insights, query)
    .slice(0, 6)
    .map((result) => ({
      ...result,
      connectionClue: createConnectionClue(result),
    }));
}

function createConnectionClue(result: InsightSearchResult): string {
  if (result.matchedFields.includes('memo') && result.insight.memo) {
    const memoToken = findMatchedToken(result.insight.memo, result);

    if (memoToken) {
      return `메모의 “${memoToken}” 단서가 겹쳐요.`;
    }
  }

  if (result.matchedFields.includes('title')) {
    const titleToken = findMatchedToken(result.insight.title, result);

    if (titleToken) {
      return `제목에서 “${titleToken}” 단서를 찾았어요.`;
    }
  }

  if (
    result.matchedFields.includes('category') &&
    result.insight.category &&
    findMatchedToken(result.insight.category, result)
  ) {
    return `“${result.insight.category}” 카테고리에 저장했어요.`;
  }

  if (
    result.matchedFields.includes('domain') &&
    findMatchedToken(result.insight.domain, result)
  ) {
    return `${result.insight.domain}에서 저장한 자료예요.`;
  }

  if (result.matchedFields.includes('originalUrl')) {
    const urlToken = findMatchedToken(result.insight.originalUrl, result);

    if (urlToken) {
      return `URL의 “${urlToken}” 단서를 찾았어요.`;
    }
  }

  throw new Error('검색 결과의 실제 일치 필드에서 연결 단서를 만들 수 없어요.');
}

function findMatchedToken(value: string, result: InsightSearchResult) {
  const fieldTokens = value.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

  for (const matchedToken of result.matchedTokens) {
    const originalFieldToken = fieldTokens.find((fieldToken) =>
      fieldToken.normalize('NFKC').toLowerCase().includes(matchedToken)
    );

    if (originalFieldToken) {
      return originalFieldToken;
    }
  }

  const normalizedValue = value.normalize('NFKC').toLowerCase();

  return result.matchedTokens.find((matchedToken) =>
    normalizedValue.includes(matchedToken)
  );
}
