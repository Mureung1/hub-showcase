import { drizzle } from 'drizzle-orm/neon-http'
import { describe, expect, it } from 'vitest'
import type { DabnyangiDatabase } from '../db/database.js'
import { retrievalEmbeddingDimensions } from './embedding.js'
import { buildExactRetrievalQuery, toRetrievalExampleRow } from './repository.js'

const testEmbedding = () => {
  const embedding = Array.from({ length: retrievalEmbeddingDimensions }, () => 0)
  embedding[0] = 1
  return embedding
}

describe('retrieval example repository', () => {
  it('maps only approved metadata and never serializes example or query text', () => {
    const unsafeCallerValue = {
      catalogVersion: 'reviewed-seeds-v1',
      checksum: 'a'.repeat(64),
      documentText: 'DB에 저장하면 안 되는 검수 원문',
      embedding: testEmbedding(),
      embeddingModel: 'voyage-test-model',
      exampleId: 'reviewed-professor-reply-ask-01',
      mode: 'reply' as const,
      purposeId: 'ask' as const,
      queryText: 'DB에 저장하면 안 되는 사용자 입력',
      reviewStatus: 'approved' as const,
      reviewedAt: new Date('2026-07-20T00:00:00.000Z'),
      scenarioId: 'professor' as const,
    }

    const row = toRetrievalExampleRow(unsafeCallerValue)
    const serialized = JSON.stringify(row)

    expect(Object.keys(row).sort()).toEqual([
      'catalogVersion',
      'checksum',
      'embedding',
      'embeddingModel',
      'exampleId',
      'mode',
      'purposeId',
      'reviewStatus',
      'reviewedAt',
      'scenarioId',
    ])
    expect(serialized).not.toContain(unsafeCallerValue.documentText)
    expect(serialized).not.toContain(unsafeCallerValue.queryText)
  })

  it('builds exact cosine top-2 SQL after catalog/model/review/scenario/purpose/mode filters', () => {
    const database = drizzle.mock() as DabnyangiDatabase
    const query = buildExactRetrievalQuery(database, {
      catalogVersion: 'reviewed-seeds-v1',
      embeddingModel: 'voyage-test-model',
      mode: 'reply',
      purposeId: 'ask',
      queryEmbedding: testEmbedding(),
      scenarioId: 'professor',
    })
    const generated = query.toSQL()

    expect(generated.sql).toContain('"embedding" <=> $1')
    expect(generated.sql).toContain('"catalog_version" = $2')
    expect(generated.sql).toContain('"embedding_model" = $3')
    expect(generated.sql).toContain('"review_status" = $4')
    expect(generated.sql).toContain('"scenario_id" = $5')
    expect(generated.sql).toContain('"purpose_id" = $6')
    expect(generated.sql).toContain('"mode" = $7')
    expect(generated.sql).toContain(
      'order by "retrieval_examples"."embedding" <=> $8 asc, "retrieval_examples"."example_id" asc limit $9',
    )
    expect(generated.params.at(-1)).toBe(2)
    expect(generated.sql).not.toMatch(/hnsw|ivfflat/iu)
  })
})
