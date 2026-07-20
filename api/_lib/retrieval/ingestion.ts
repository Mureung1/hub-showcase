import type { RetrievalCatalogEntry } from './catalog'
import type { EmbeddingProvider } from './embedding'
import type { RetrievalExampleRepository } from './repository'

export type RetrievalIngestionDependencies = {
  readonly catalog: readonly RetrievalCatalogEntry[]
  readonly embeddingProvider: EmbeddingProvider
  readonly repository: Pick<RetrievalExampleRepository, 'findIdentity' | 'upsertApproved'>
}

export type RetrievalIngestionResult = {
  readonly catalogVersion: string | null
  readonly embeddingModel: string
  readonly insertedCount: number
  readonly unchangedCount: number
}

export const ingestReviewedRetrievalCatalog = async (
  dependencies: RetrievalIngestionDependencies,
  signal?: AbortSignal,
): Promise<RetrievalIngestionResult> => {
  const versions = new Set(dependencies.catalog.map((entry) => entry.catalogVersion))
  if (versions.size > 1) throw new Error('Retrieval ingestion requires one catalog version')

  const entriesToInsert: RetrievalCatalogEntry[] = []
  let unchangedCount = 0
  for (const entry of dependencies.catalog) {
    if (entry.reviewStatus !== 'approved') continue
    const identity = {
      catalogVersion: entry.catalogVersion,
      embeddingModel: dependencies.embeddingProvider.model,
      exampleId: entry.exampleId,
    }
    const existing = await dependencies.repository.findIdentity(identity)
    if (existing) {
      if (existing.checksum !== entry.checksum) {
        throw new Error('Retrieval example checksum conflict requires a new catalog version')
      }
      unchangedCount += 1
      continue
    }
    entriesToInsert.push(entry)
  }

  let insertedCount = 0
  for (const entry of entriesToInsert) {
    const embedding = await dependencies.embeddingProvider.embed({
      input: entry.documentText,
      inputType: 'document',
      ...(signal ? { signal } : {}),
    })
    await dependencies.repository.upsertApproved({
      catalogVersion: entry.catalogVersion,
      checksum: entry.checksum,
      embedding,
      embeddingModel: dependencies.embeddingProvider.model,
      exampleId: entry.exampleId,
      mode: entry.mode,
      purposeId: entry.purposeId,
      reviewStatus: entry.reviewStatus,
      reviewedAt: entry.reviewedAt,
      scenarioId: entry.scenarioId,
    })
    insertedCount += 1
  }

  return {
    catalogVersion: versions.values().next().value ?? null,
    embeddingModel: dependencies.embeddingProvider.model,
    insertedCount,
    unchangedCount,
  }
}
