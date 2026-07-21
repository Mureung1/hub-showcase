import { and, asc, cosineDistance, eq, sql } from 'drizzle-orm'
import type { Mode, PurposeId, ScenarioId } from '../../../src/entities/message/index.js'
import type { DabnyangiDatabase } from '../db/database.js'
import {
  retrievalExamples,
  type NewRetrievalExampleRow,
} from '../db/schema.js'
import { validateEmbedding } from './embedding.js'

export const retrievalResultCount = 2

export type RetrievalExampleMetadata = {
  readonly catalogVersion: string
  readonly checksum: string
  readonly embedding: readonly number[]
  readonly embeddingModel: string
  readonly exampleId: string
  readonly mode: Mode
  readonly purposeId: PurposeId
  readonly reviewStatus: 'approved'
  readonly reviewedAt: Date
  readonly scenarioId: ScenarioId
}

export type ExactRetrievalSearch = {
  readonly catalogVersion: string
  readonly embeddingModel: string
  readonly mode: Mode
  readonly purposeId: PurposeId
  readonly queryEmbedding: readonly number[]
  readonly scenarioId: ScenarioId
}

export type ExactRetrievalResult = {
  readonly checksum: string
  readonly distance: number
  readonly exampleId: string
}

export type RetrievalExampleIdentity = {
  readonly catalogVersion: string
  readonly embeddingModel: string
  readonly exampleId: string
}

export type ExistingRetrievalExample = {
  readonly checksum: string
}

export type RetrievalExampleRepository = {
  findIdentity: (identity: RetrievalExampleIdentity) => Promise<ExistingRetrievalExample | null>
  searchApprovedPair: (search: ExactRetrievalSearch) => Promise<readonly ExactRetrievalResult[]>
  upsertApproved: (metadata: RetrievalExampleMetadata) => Promise<void>
}

export const toRetrievalExampleRow = (
  metadata: RetrievalExampleMetadata,
): NewRetrievalExampleRow => ({
  catalogVersion: metadata.catalogVersion,
  checksum: metadata.checksum,
  embedding: validateEmbedding(metadata.embedding),
  embeddingModel: metadata.embeddingModel,
  exampleId: metadata.exampleId,
  mode: metadata.mode,
  purposeId: metadata.purposeId,
  reviewStatus: metadata.reviewStatus,
  reviewedAt: metadata.reviewedAt,
  scenarioId: metadata.scenarioId,
})

export const buildExactRetrievalQuery = (
  database: DabnyangiDatabase,
  search: ExactRetrievalSearch,
) => {
  const queryEmbedding = validateEmbedding(search.queryEmbedding)
  const distance = sql<number>`${cosineDistance(retrievalExamples.embedding, queryEmbedding)}`

  return database
    .select({
      checksum: retrievalExamples.checksum,
      distance,
      exampleId: retrievalExamples.exampleId,
    })
    .from(retrievalExamples)
    .where(
      and(
        eq(retrievalExamples.catalogVersion, search.catalogVersion),
        eq(retrievalExamples.embeddingModel, search.embeddingModel),
        eq(retrievalExamples.reviewStatus, 'approved'),
        eq(retrievalExamples.scenarioId, search.scenarioId),
        eq(retrievalExamples.purposeId, search.purposeId),
        eq(retrievalExamples.mode, search.mode),
      ),
    )
    .orderBy(asc(distance), asc(retrievalExamples.exampleId))
    .limit(retrievalResultCount)
}

export const createDrizzleRetrievalExampleRepository = (
  database: DabnyangiDatabase,
): RetrievalExampleRepository => ({
  async findIdentity(identity) {
    const rows = await database
      .select({ checksum: retrievalExamples.checksum })
      .from(retrievalExamples)
      .where(
        and(
          eq(retrievalExamples.exampleId, identity.exampleId),
          eq(retrievalExamples.catalogVersion, identity.catalogVersion),
          eq(retrievalExamples.embeddingModel, identity.embeddingModel),
        ),
      )
      .limit(1)
    return rows[0] ?? null
  },
  async searchApprovedPair(search) {
    return buildExactRetrievalQuery(database, search)
  },
  async upsertApproved(metadata) {
    const row = toRetrievalExampleRow(metadata)
    const rows = await database
      .insert(retrievalExamples)
      .values(row)
      .onConflictDoUpdate({
        set: {
          embedding: row.embedding,
          reviewedAt: row.reviewedAt,
          reviewStatus: row.reviewStatus,
        },
        setWhere: eq(retrievalExamples.checksum, row.checksum),
        target: [
          retrievalExamples.exampleId,
          retrievalExamples.catalogVersion,
          retrievalExamples.embeddingModel,
        ],
      })
      .returning({ exampleId: retrievalExamples.exampleId })

    if (rows.length !== 1) {
      throw new Error('Retrieval example checksum conflict requires a new catalog version')
    }
  },
})
