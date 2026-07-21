import { retrievalCoverageReport, type RetrievalCoverageReport } from './coverage.js'
import { reviewedRetrievalCatalog } from './catalog.js'

export type RankingEvaluationCase = {
  readonly caseId: string
  readonly expectedExampleId: string
  readonly retrievalEstimatedCostMicroUsd: number
  readonly retrievalLatencyMs: number
  readonly retrievalRanking: readonly string[]
  readonly staticEstimatedCostMicroUsd: number
  readonly staticLatencyMs: number
  readonly staticRanking: readonly string[]
}

export type RankingMetrics = {
  readonly averageEstimatedCostMicroUsd: number
  readonly averageLatencyMs: number
  readonly meanReciprocalRankBasisPoints: number
  readonly recallAt2BasisPoints: number
  readonly sampleCount: number
}

export type GenerationQualityEvidence = {
  readonly factViolationRateBasisPoints: number
  readonly sendabilityPassRateBasisPoints: number
  readonly tonePassRateBasisPoints: number
}

export type OfflineRetrievalEvaluationReport = {
  readonly coverage: RetrievalCoverageReport
  readonly evidence: 'synthetic-only'
  readonly generationQuality: GenerationQualityEvidence | null
  readonly productionEligible: false
  readonly retrieval: RankingMetrics
  readonly static: RankingMetrics
}

const basisPoints = (value: number) => Math.round(value * 10_000)
const average = (values: readonly number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length

const rankingMetrics = (
  cases: readonly RankingEvaluationCase[],
  route: 'retrieval' | 'static',
): RankingMetrics => {
  const rankings = cases.map((evaluationCase) =>
    route === 'retrieval' ? evaluationCase.retrievalRanking : evaluationCase.staticRanking,
  )
  const reciprocalRanks = rankings.map((ranking, index) => {
    const expectedId = cases[index]?.expectedExampleId
    const rank = ranking.findIndex((exampleId) => exampleId === expectedId)
    return rank < 0 ? 0 : 1 / (rank + 1)
  })
  const recallAt2 = rankings.map((ranking, index) =>
    ranking.slice(0, 2).includes(cases[index]?.expectedExampleId ?? '') ? 1 : 0,
  )

  return {
    averageEstimatedCostMicroUsd: Math.round(
      average(
        cases.map((evaluationCase) =>
          route === 'retrieval'
            ? evaluationCase.retrievalEstimatedCostMicroUsd
            : evaluationCase.staticEstimatedCostMicroUsd,
        ),
      ),
    ),
    averageLatencyMs: Math.round(
      average(
        cases.map((evaluationCase) =>
          route === 'retrieval'
            ? evaluationCase.retrievalLatencyMs
            : evaluationCase.staticLatencyMs,
        ),
      ),
    ),
    meanReciprocalRankBasisPoints: basisPoints(average(reciprocalRanks)),
    recallAt2BasisPoints: basisPoints(average(recallAt2)),
    sampleCount: cases.length,
  }
}

export const evaluateSyntheticRetrievalRankings = (
  cases: readonly RankingEvaluationCase[],
): OfflineRetrievalEvaluationReport => ({
  coverage: retrievalCoverageReport(reviewedRetrievalCatalog),
  evidence: 'synthetic-only',
  generationQuality: null,
  productionEligible: false,
  retrieval: rankingMetrics(cases, 'retrieval'),
  static: rankingMetrics(cases, 'static'),
})

export const syntheticRankingCases: readonly RankingEvaluationCase[] = [
  {
    caseId: 'synthetic-groupwork-reply-ask',
    expectedExampleId: 'reviewed-groupwork-reply-ask-01',
    retrievalEstimatedCostMicroUsd: 3,
    retrievalLatencyMs: 45,
    retrievalRanking: [
      'reviewed-groupwork-reply-ask-01',
      'synthetic-groupwork-reply-ask-02',
    ],
    staticEstimatedCostMicroUsd: 0,
    staticLatencyMs: 0,
    staticRanking: [
      'reviewed-groupwork-initiate-suggest-01',
      'reviewed-groupwork-reply-ask-01',
    ],
  },
  {
    caseId: 'synthetic-professor-initiate-other',
    expectedExampleId: 'reviewed-professor-initiate-other-01',
    retrievalEstimatedCostMicroUsd: 3,
    retrievalLatencyMs: 42,
    retrievalRanking: [
      'reviewed-professor-initiate-other-01',
      'synthetic-professor-initiate-other-02',
    ],
    staticEstimatedCostMicroUsd: 0,
    staticLatencyMs: 0,
    staticRanking: [
      'reviewed-professor-reply-suggest-01',
      'reviewed-professor-initiate-other-01',
    ],
  },
  {
    caseId: 'synthetic-senior-initiate-question',
    expectedExampleId: 'reviewed-senior-initiate-question-01',
    retrievalEstimatedCostMicroUsd: 3,
    retrievalLatencyMs: 48,
    retrievalRanking: [
      'reviewed-senior-initiate-question-01',
      'synthetic-senior-initiate-question-02',
    ],
    staticEstimatedCostMicroUsd: 0,
    staticLatencyMs: 0,
    staticRanking: [
      'reviewed-senior-reply-other-01',
      'reviewed-senior-initiate-question-01',
    ],
  },
  {
    caseId: 'synthetic-friend-reply-apologize',
    expectedExampleId: 'reviewed-friend-reply-apologize-01',
    retrievalEstimatedCostMicroUsd: 3,
    retrievalLatencyMs: 44,
    retrievalRanking: [
      'reviewed-friend-reply-apologize-01',
      'synthetic-friend-reply-apologize-02',
    ],
    staticEstimatedCostMicroUsd: 0,
    staticLatencyMs: 0,
    staticRanking: [
      'reviewed-friend-initiate-suggest-01',
      'reviewed-friend-reply-apologize-01',
    ],
  },
]
