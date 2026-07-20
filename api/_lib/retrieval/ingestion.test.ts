import { describe, expect, it } from 'vitest'
import { reviewedRetrievalCatalog } from './catalog'
import { retrievalEmbeddingDimensions, type EmbeddingProvider } from './embedding'
import { ingestReviewedRetrievalCatalog } from './ingestion'
import type { RetrievalExampleMetadata } from './repository'

const testEmbedding = () => {
  const embedding = Array.from({ length: retrievalEmbeddingDimensions }, () => 0)
  embedding[0] = 1
  return embedding
}

describe('retrieval catalog ingestion boundary', () => {
  it('embeds approved Git documents and sends only allowlisted metadata to an idempotent repository', async () => {
    const embeddingRequests: Array<{ input: string; inputType: string }> = []
    const rows: RetrievalExampleMetadata[] = []
    const storedChecksums = new Map<string, string>()
    const provider: EmbeddingProvider = {
      dimensions: retrievalEmbeddingDimensions,
      model: 'voyage-test-model',
      embed(request) {
        embeddingRequests.push({ input: request.input, inputType: request.inputType })
        return Promise.resolve(testEmbedding())
      },
    }
    const repository = {
      findIdentity(identity: { catalogVersion: string; embeddingModel: string; exampleId: string }) {
        const checksum = storedChecksums.get(JSON.stringify(identity))
        return Promise.resolve(checksum ? { checksum } : null)
      },
      upsertApproved(row: RetrievalExampleMetadata) {
        rows.push(row)
        storedChecksums.set(
          JSON.stringify({
            catalogVersion: row.catalogVersion,
            embeddingModel: row.embeddingModel,
            exampleId: row.exampleId,
          }),
          row.checksum,
        )
        return Promise.resolve()
      },
    }
    const catalog = reviewedRetrievalCatalog.slice(0, 2)

    const first = await ingestReviewedRetrievalCatalog({ catalog, embeddingProvider: provider, repository })
    const second = await ingestReviewedRetrievalCatalog({ catalog, embeddingProvider: provider, repository })

    expect(first).toEqual({
      catalogVersion: 'reviewed-seeds-v1',
      embeddingModel: 'voyage-test-model',
      insertedCount: 2,
      unchangedCount: 0,
    })
    expect(second).toEqual({
      catalogVersion: 'reviewed-seeds-v1',
      embeddingModel: 'voyage-test-model',
      insertedCount: 0,
      unchangedCount: 2,
    })
    expect(embeddingRequests).toHaveLength(2)
    expect(embeddingRequests.every((request) => request.inputType === 'document')).toBe(true)
    expect(rows).toHaveLength(2)
    expect(JSON.stringify(rows)).not.toContain(catalog[0]?.documentText)
    expect(JSON.stringify(rows)).not.toContain(catalog[1]?.documentText)
  })

  it('rejects a mixed catalog version before provider or database access', async () => {
    let called = false
    const first = reviewedRetrievalCatalog[0]
    if (!first) throw new Error('Test fixture missing')

    await expect(
      ingestReviewedRetrievalCatalog({
        catalog: [first, { ...first, catalogVersion: 'other-version' }],
        embeddingProvider: {
          dimensions: retrievalEmbeddingDimensions,
          model: 'voyage-test-model',
          embed() {
            called = true
            return Promise.resolve(testEmbedding())
          },
        },
        repository: {
          findIdentity() {
            called = true
            return Promise.resolve(null)
          },
          upsertApproved() {
            called = true
            return Promise.resolve()
          },
        },
      }),
    ).rejects.toThrow('one catalog version')
    expect(called).toBe(false)
  })

  it('rejects same natural key with changed checksum before document embedding', async () => {
    let embedded = false
    const first = reviewedRetrievalCatalog[0]
    const second = reviewedRetrievalCatalog[1]
    if (!first || !second) throw new Error('Test fixture missing')

    await expect(
      ingestReviewedRetrievalCatalog({
        catalog: [first, second],
        embeddingProvider: {
          dimensions: retrievalEmbeddingDimensions,
          model: 'voyage-test-model',
          embed() {
            embedded = true
            return Promise.resolve(testEmbedding())
          },
        },
        repository: {
          findIdentity: (identity) =>
            Promise.resolve(
              identity.exampleId === second.exampleId ? { checksum: 'f'.repeat(64) } : null,
            ),
          upsertApproved: () => Promise.resolve(),
        },
      }),
    ).rejects.toThrow('new catalog version')
    expect(embedded).toBe(false)
  })
})
