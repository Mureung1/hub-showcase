import { describe, expect, it } from 'vitest'
import { reviewedPromptExampleCatalog } from '../prompt/seedExamples.js'
import {
  checksumForReviewedExample,
  reviewedRetrievalCatalog,
  retrievalDocumentTextFor,
} from './catalog.js'
import { retrievalCoverageReport, requireProductionRetrievalCoverage } from './coverage.js'

describe('reviewed retrieval catalog', () => {
  it('derives deterministic checksums from the Git-owned reviewed examples', () => {
    expect(reviewedRetrievalCatalog).toHaveLength(8)
    expect(new Set(reviewedRetrievalCatalog.map((entry) => entry.exampleId)).size).toBe(8)

    reviewedRetrievalCatalog.forEach((entry) => {
      expect(entry.checksum).toMatch(/^[0-9a-f]{64}$/u)
      expect(entry.checksum).toBe(checksumForReviewedExample(entry.example))
      expect(entry.reviewStatus).toBe('approved')
      expect(entry.mode).toBe(entry.example.receivedMessage ? 'reply' : 'initiate')
    })
  })

  it('keeps embedding document text derived from, but outside, database metadata', () => {
    const example = reviewedPromptExampleCatalog[0]
    expect(example).toBeDefined()
    if (!example) throw new Error('Test fixture missing')

    const documentText = retrievalDocumentTextFor(example)
    expect(documentText).toContain(example.situation)
    expect(documentText).not.toContain(example.candidates[0]?.text)
    expect(Object.keys(reviewedRetrievalCatalog[0] ?? {})).toContain('documentText')
  })

  it('blocks production activation because 8 sets/24 candidates do not cover 48 cells twice', () => {
    const report = retrievalCoverageReport(reviewedRetrievalCatalog)

    expect(report).toMatchObject({
      activationReadyCellCount: 0,
      candidateCount: 24,
      coveredCellCount: 8,
      eligibleForProduction: false,
      exampleSetCount: 8,
      requiredCellCount: 48,
    })
    expect(report.missingCells).toHaveLength(48)
    expect(() => requireProductionRetrievalCoverage(reviewedRetrievalCatalog)).toThrow(
      'coverage is insufficient',
    )
  })
})
