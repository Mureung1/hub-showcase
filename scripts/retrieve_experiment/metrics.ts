import type { RelevanceGrade } from './contracts';

const SCORE_TIE_EPSILON = 1e-12;

export type RankingMetrics = {
  recallAt5: number;
  mrrAt6: number;
  ndcgAt6: number;
  returnedResultCount: number;
};

export type QueryScoreComparison = {
  queryId: string;
  baselineScore: number;
  candidateScore: number;
};

export type QueryScoreSummary = {
  wins: number;
  ties: number;
  losses: number;
};

export function calculateRankingMetrics(
  rankedInsightIds: readonly string[],
  relevanceByInsightId: Readonly<Record<string, RelevanceGrade>>
): RankingMetrics {
  const recallAt5 = rankedInsightIds
    .slice(0, 5)
    .some((insightId) => isRelevant(relevanceByInsightId[insightId]))
    ? 1
    : 0;
  const firstRelevantIndex = rankedInsightIds
    .slice(0, 6)
    .findIndex((insightId) => isRelevant(relevanceByInsightId[insightId]));
  const idealGrades = Object.values(relevanceByInsightId)
    .filter(isRelevant)
    .sort((current, next) => next - current)
    .slice(0, 6);
  const idealDcg = calculateDiscountedCumulativeGain(idealGrades);
  const rankedGrades = rankedInsightIds
    .slice(0, 6)
    .map((insightId) => relevanceByInsightId[insightId] ?? 0);
  const dcg = calculateDiscountedCumulativeGain(rankedGrades);

  return {
    recallAt5,
    mrrAt6: firstRelevantIndex < 0 ? 0 : 1 / (firstRelevantIndex + 1),
    ndcgAt6: idealDcg === 0 ? 0 : dcg / idealDcg,
    returnedResultCount: rankedInsightIds.length,
  };
}

export function compareQueryScores(
  comparisons: readonly QueryScoreComparison[]
): QueryScoreSummary {
  return comparisons.reduce<QueryScoreSummary>(
    (summary, comparison) => {
      const scoreDifference =
        comparison.candidateScore - comparison.baselineScore;

      if (Math.abs(scoreDifference) <= SCORE_TIE_EPSILON) {
        summary.ties += 1;
      } else if (scoreDifference > 0) {
        summary.wins += 1;
      } else {
        summary.losses += 1;
      }

      return summary;
    },
    {
      wins: 0,
      ties: 0,
      losses: 0,
    }
  );
}

function calculateDiscountedCumulativeGain(
  grades: readonly RelevanceGrade[]
): number {
  return grades.reduce<number>((score, grade, index) => {
    const gain = 2 ** grade - 1;
    const discount = Math.log2(index + 2);

    return score + gain / discount;
  }, 0);
}

function isRelevant(
  grade: RelevanceGrade | undefined
): grade is Exclude<RelevanceGrade, 0> {
  return grade === 1 || grade === 2;
}
