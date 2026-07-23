import type { Insight } from '../../src/entities/insight/model/insight';
import { searchInsights } from '../../src/entities/insight/model/search_insights';

import type { EvaluationInsight } from './contracts';

export type RankedInsight = {
  insightId: string;
  score: number;
};

export type EmbeddedInsight = {
  insightId: string;
  vector: readonly number[];
};

export type CachedRankings = {
  lexical: readonly string[];
  semantic: readonly string[];
};

export function rankLexically(
  insights: readonly EvaluationInsight[],
  query: string
): RankedInsight[] {
  return searchInsights(insights.map(toProductInsight), query).map(
    ({ insight, score }) => ({
      insightId: insight.id,
      score,
    })
  );
}

export function cosineSimilarity(
  left: readonly number[],
  right: readonly number[]
): number {
  if (left.length === 0 || left.length !== right.length) {
    throw new Error(
      `코사인 유사도 벡터 차원이 다릅니다: ${left.length}, ${right.length}`
    );
  }

  assertFiniteVector(left, '왼쪽');
  assertFiniteVector(right, '오른쪽');

  let dotProduct = 0;
  let leftSquaredMagnitude = 0;
  let rightSquaredMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;

    dotProduct += leftValue * rightValue;
    leftSquaredMagnitude += leftValue ** 2;
    rightSquaredMagnitude += rightValue ** 2;
  }

  if (leftSquaredMagnitude === 0 || rightSquaredMagnitude === 0) {
    throw new Error('코사인 유사도는 영벡터를 허용하지 않습니다.');
  }

  return (
    dotProduct /
    (Math.sqrt(leftSquaredMagnitude) * Math.sqrt(rightSquaredMagnitude))
  );
}

export function rankByCosine(
  queryVector: readonly number[],
  candidates: readonly EmbeddedInsight[]
): RankedInsight[] {
  return candidates
    .map(({ insightId, vector }) => ({
      insightId,
      score: cosineSimilarity(queryVector, vector),
    }))
    .sort(compareRankedInsights);
}

export function fuseRankings(
  rankings: CachedRankings,
  rankConstant: number
): RankedInsight[] {
  const scoreByInsightId = new Map<string, number>();

  addReciprocalRankScores(scoreByInsightId, rankings.lexical, rankConstant);
  addReciprocalRankScores(scoreByInsightId, rankings.semantic, rankConstant);

  return Array.from(scoreByInsightId, ([insightId, score]) => ({
    insightId,
    score,
  })).sort(compareRankedInsights);
}

function toProductInsight(insight: EvaluationInsight): Insight {
  return {
    ...insight,
    normalizedUrl: insight.originalUrl,
    titleOrigin: 'fallback',
    updatedAt: insight.createdAt,
  };
}

function assertFiniteVector(vector: readonly number[], label: string): void {
  if (vector.some((value) => !Number.isFinite(value))) {
    throw new Error(`${label} 벡터는 유한한 숫자만 포함해야 합니다.`);
  }
}

function addReciprocalRankScores(
  scoreByInsightId: Map<string, number>,
  ranking: readonly string[],
  rankConstant: number
): void {
  ranking.forEach((insightId, index) => {
    const score = 1 / (rankConstant + index + 1);
    const currentScore = scoreByInsightId.get(insightId) ?? 0;

    scoreByInsightId.set(insightId, currentScore + score);
  });
}

function compareRankedInsights(
  current: RankedInsight,
  next: RankedInsight
): number {
  return (
    next.score - current.score || compareText(current.insightId, next.insightId)
  );
}

function compareText(current: string, next: string): number {
  if (current === next) {
    return 0;
  }

  return current < next ? -1 : 1;
}
