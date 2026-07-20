import { describe, expect, it } from 'vitest'
import type { ExactRetrievalSearch } from './repository'
import {
  reviewedRetrievalCatalog,
  type RetrievalCatalogEntry,
} from './catalog'
import { retrievalEmbeddingDimensions, type EmbeddingProvider } from './embedding'
import { createReviewedExampleSelector } from './selector'

const testEmbedding = () => {
  const embedding = Array.from({ length: retrievalEmbeddingDimensions }, () => 0)
  embedding[0] = 1
  return embedding
}

const request = {
  mode: 'reply' as const,
  purposeId: 'ask' as const,
  queryText: 'DB나 로그에 저장하면 안 되는 사용자 query',
  scenarioId: 'groupwork' as const,
}

const provider = (onEmbed?: () => void): EmbeddingProvider => ({
  dimensions: retrievalEmbeddingDimensions,
  model: 'voyage-test-model',
  embed(embeddingRequest) {
    onEmbed?.()
    expect(embeddingRequest.inputType).toBe('query')
    return Promise.resolve(testEmbedding())
  },
})

const twoMatchingEntries = (): readonly [RetrievalCatalogEntry, RetrievalCatalogEntry] => {
  const first = reviewedRetrievalCatalog.find(
    (entry) =>
      entry.scenarioId === request.scenarioId &&
      entry.purposeId === request.purposeId &&
      entry.mode === request.mode,
  )
  if (!first) throw new Error('Test fixture missing')
  const second: RetrievalCatalogEntry = {
    ...first,
    checksum: 'b'.repeat(64),
    example: { ...first.example, exampleId: 'synthetic-groupwork-reply-ask-02' },
    exampleId: 'synthetic-groupwork-reply-ask-02',
  }
  return [first, second]
}

describe('reviewed example selector', () => {
  it('defaults to static selection without embedding or repository access', async () => {
    let called = false
    const selector = createReviewedExampleSelector({
      embeddingProvider: provider(() => {
        called = true
      }),
      repository: {
        searchApprovedPair() {
          called = true
          return Promise.resolve([])
        },
      },
    })

    await expect(selector.select(request)).resolves.toMatchObject({
      reason: 'retrieval_disabled',
      source: 'static',
    })
    expect(called).toBe(false)
  })

  it('uses exactly two checksum-matched reviewed examples only in retrieval-eval mode', async () => {
    const entries = twoMatchingEntries()
    let capturedSearch: ExactRetrievalSearch | undefined
    const selector = createReviewedExampleSelector({
      embeddingProvider: provider(),
      mode: 'retrieval-eval',
      repository: {
        searchApprovedPair(search) {
          capturedSearch = search
          return Promise.resolve(
            entries.map((entry, index) => ({
              checksum: entry.checksum,
              distance: index / 10,
              exampleId: entry.exampleId,
            })),
          )
        },
      },
      resolveEntry: (exampleId) =>
        entries.find((entry) => entry.exampleId === exampleId) ?? null,
    })

    await expect(selector.select(request)).resolves.toMatchObject({
      reason: 'retrieval_success',
      source: 'retrieval',
    })
    expect(capturedSearch).toMatchObject({
      catalogVersion: 'reviewed-seeds-v1',
      embeddingModel: 'voyage-test-model',
      mode: 'reply',
      purposeId: 'ask',
      scenarioId: 'groupwork',
    })
    expect(JSON.stringify(capturedSearch)).not.toContain(request.queryText)
  })

  it.each([
    ['too_few_candidates', 'few'],
    ['checksum_mismatch', 'checksum'],
    ['unknown_example', 'unknown'],
  ] as const)('falls back to static for %s', async (expectedReason, failure) => {
    const entries = twoMatchingEntries()
    const selector = createReviewedExampleSelector({
      embeddingProvider: provider(),
      mode: 'retrieval-eval',
      repository: {
        searchApprovedPair() {
          if (failure === 'few') {
            return Promise.resolve([
              { checksum: entries[0].checksum, distance: 0, exampleId: entries[0].exampleId },
            ])
          }
          return Promise.resolve([
            {
              checksum: failure === 'checksum' ? 'c'.repeat(64) : entries[0].checksum,
              distance: 0,
              exampleId: entries[0].exampleId,
            },
            {
              checksum: entries[1].checksum,
              distance: 0.1,
              exampleId: failure === 'unknown' ? 'missing-id' : entries[1].exampleId,
            },
          ])
        },
      },
      resolveEntry: (exampleId) =>
        entries.find((entry) => entry.exampleId === exampleId) ?? null,
    })

    await expect(selector.select(request)).resolves.toMatchObject({
      reason: expectedReason,
      source: 'static',
    })
  })

  it('falls back to static when embedding or search fails', async () => {
    const selector = createReviewedExampleSelector({
      embeddingProvider: {
        ...provider(),
        embed: () => Promise.reject(new Error('synthetic provider failure')),
      },
      mode: 'retrieval-eval',
      repository: { searchApprovedPair: () => Promise.resolve([]) },
    })

    await expect(selector.select(request)).resolves.toMatchObject({
      reason: 'provider_failed',
      source: 'static',
    })
  })
})
