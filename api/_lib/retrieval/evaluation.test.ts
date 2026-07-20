import { describe, expect, it } from 'vitest'
import {
  evaluateSyntheticRetrievalRankings,
  syntheticRankingCases,
} from './evaluation'

describe('synthetic offline retrieval evaluation', () => {
  it('compares ranking, latency, and cost without claiming generation quality or production readiness', () => {
    const report = evaluateSyntheticRetrievalRankings(syntheticRankingCases)

    expect(report).toMatchObject({
      evidence: 'synthetic-only',
      generationQuality: null,
      productionEligible: false,
      retrieval: {
        averageEstimatedCostMicroUsd: 3,
        averageLatencyMs: 45,
        meanReciprocalRankBasisPoints: 10_000,
        recallAt2BasisPoints: 10_000,
        sampleCount: 4,
      },
      static: {
        averageEstimatedCostMicroUsd: 0,
        averageLatencyMs: 0,
        meanReciprocalRankBasisPoints: 5_000,
        recallAt2BasisPoints: 10_000,
        sampleCount: 4,
      },
    })
    expect(report.coverage.eligibleForProduction).toBe(false)
  })
})
