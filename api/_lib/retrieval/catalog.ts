import { createHash } from 'node:crypto'
import type { Mode, PurposeId, ScenarioId } from '../../../src/entities/message/index.js'
import type { ReviewedPromptExampleSet } from '../prompt/examples.js'
import {
  reviewedPromptExampleCatalog,
  reviewedSeedCatalogVersion,
} from '../prompt/seedExamples.js'

export const reviewedSeedReviewedAt = new Date('2026-07-20T00:00:00.000Z')

export type RetrievalCatalogEntry = {
  readonly catalogVersion: string
  readonly checksum: string
  readonly documentText: string
  readonly example: ReviewedPromptExampleSet
  readonly exampleId: string
  readonly mode: Mode
  readonly purposeId: PurposeId
  readonly reviewStatus: 'approved'
  readonly reviewedAt: Date
  readonly scenarioId: ScenarioId
}

const canonicalExampleSource = (example: ReviewedPromptExampleSet) =>
  JSON.stringify({
    candidates: example.candidates.map((candidate) => ({
      text: candidate.text,
      toneLevel: candidate.toneLevel,
    })),
    catalogVersion: example.catalogVersion,
    exampleId: example.exampleId,
    mode: example.mode,
    purpose: example.purpose,
    receivedMessage: example.receivedMessage ?? null,
    scenarioId: example.scenarioId,
    situation: example.situation,
  })

export const checksumForReviewedExample = (example: ReviewedPromptExampleSet) =>
  createHash('sha256').update(canonicalExampleSource(example)).digest('hex')

export const retrievalDocumentTextFor = (example: ReviewedPromptExampleSet) =>
  [
    `관계: ${example.scenarioId}`,
    `목적: ${example.purpose}`,
    `방식: ${example.mode}`,
    `상황: ${example.situation}`,
    ...(example.receivedMessage ? [`받은 메시지: ${example.receivedMessage}`] : []),
  ].join('\n')

const toRetrievalCatalogEntry = (example: ReviewedPromptExampleSet): RetrievalCatalogEntry => ({
  catalogVersion: example.catalogVersion,
  checksum: checksumForReviewedExample(example),
  documentText: retrievalDocumentTextFor(example),
  example,
  exampleId: example.exampleId,
  mode: example.mode,
  purposeId: example.purpose,
  reviewStatus: 'approved',
  reviewedAt: reviewedSeedReviewedAt,
  scenarioId: example.scenarioId,
})

export const reviewedRetrievalCatalog: readonly RetrievalCatalogEntry[] =
  reviewedPromptExampleCatalog.map(toRetrievalCatalogEntry)

const reviewedRetrievalCatalogById = new Map(
  reviewedRetrievalCatalog.map((entry) => [entry.exampleId, entry] as const),
)

if (reviewedRetrievalCatalogById.size !== reviewedRetrievalCatalog.length) {
  throw new Error('Reviewed retrieval example IDs must be unique')
}
if (!reviewedRetrievalCatalog.every((entry) => entry.catalogVersion === reviewedSeedCatalogVersion)) {
  throw new Error('Reviewed retrieval catalog versions must match')
}

export const reviewedRetrievalEntryFor = (exampleId: string) =>
  reviewedRetrievalCatalogById.get(exampleId) ?? null
