import { databaseUrlFromEnvironment } from '../api/_lib/db/database.js'

export const retrievalIngestConfirmation = 't35-development-write'

export type RetrievalIngestEnvironment = {
  readonly DATABASE_URL?: string
  readonly RETRIEVAL_INGEST_CONFIRM?: string
  readonly VERCEL_ENV?: string
  readonly VOYAGE_API_KEY?: string
  readonly VOYAGE_EMBEDDING_MODEL?: string
}

export type RetrievalIngestConfiguration = {
  readonly apiKey: string
  readonly databaseUrl: string
  readonly embeddingModel: string
}

export const retrievalIngestConfiguration = (
  environment: RetrievalIngestEnvironment,
): RetrievalIngestConfiguration => {
  if (environment.VERCEL_ENV === 'production') {
    throw new Error('T35 retrieval ingestion cannot run against production')
  }
  if (environment.RETRIEVAL_INGEST_CONFIRM !== retrievalIngestConfirmation) {
    throw new Error(
      `Set RETRIEVAL_INGEST_CONFIRM=${retrievalIngestConfirmation} to allow development ingestion`,
    )
  }

  const databaseUrl = databaseUrlFromEnvironment(environment)
  const apiKey = environment.VOYAGE_API_KEY?.trim()
  const embeddingModel = environment.VOYAGE_EMBEDDING_MODEL?.trim()
  if (!databaseUrl) throw new Error('Set DATABASE_URL before T35 retrieval ingestion')
  if (!apiKey) throw new Error('Set VOYAGE_API_KEY before T35 retrieval ingestion')
  if (!embeddingModel) {
    throw new Error('Set VOYAGE_EMBEDDING_MODEL before T35 retrieval ingestion')
  }

  return { apiKey, databaseUrl, embeddingModel }
}
