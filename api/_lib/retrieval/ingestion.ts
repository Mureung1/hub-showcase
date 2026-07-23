import type { RetrievalCatalogEntry } from './catalog.js'
import type { EmbeddingProvider } from './embedding.js'
import type { RetrievalExampleRepository } from './repository.js'

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

  const embeddings =
    entriesToInsert.length === 0
      ? []
      : dependencies.embeddingProvider.embedMany
        ? await dependencies.embeddingProvider.embedMany({
            inputs: entriesToInsert.map((entry) => entry.documentText),
            inputType: 'document',
            ...(signal ? { signal } : {}),
          })
        : await Promise.all(
            entriesToInsert.map((entry) =>
              dependencies.embeddingProvider.embed({
                input: entry.documentText,
                inputType: 'document',
                ...(signal ? { signal } : {}),
              }),
            ),
          )

  if (embeddings.length !== entriesToInsert.length) {
    throw new Error('Retrieval ingestion embedding count mismatch')
  }

  let insertedCount = 0
  for (const [index, entry] of entriesToInsert.entries()) {
    const embedding = embeddings[index]
    if (!embedding) throw new Error('Retrieval ingestion embedding missing')
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
