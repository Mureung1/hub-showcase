import { describe, expect, it } from 'vitest'
import {
  retrievalIngestConfirmation,
  retrievalIngestConfiguration,
} from './retrievalIngestEnvironment'

const validEnvironment = {
  DATABASE_URL: 'postgresql://example.test/db',
  RETRIEVAL_INGEST_CONFIRM: retrievalIngestConfirmation,
  VERCEL_ENV: 'preview',
  VOYAGE_API_KEY: 'test-secret',
  VOYAGE_EMBEDDING_MODEL: 'voyage-test-model',
} as const

describe('T35 retrieval ingestion environment guard', () => {
  it('always rejects production', () => {
    expect(() =>
      retrievalIngestConfiguration({ ...validEnvironment, VERCEL_ENV: 'production' }),
    ).toThrow('cannot run against production')
  })

  it('requires explicit development-write confirmation', () => {
    expect(() =>
      retrievalIngestConfiguration({
        DATABASE_URL: validEnvironment.DATABASE_URL,
        VOYAGE_API_KEY: validEnvironment.VOYAGE_API_KEY,
        VOYAGE_EMBEDDING_MODEL: validEnvironment.VOYAGE_EMBEDDING_MODEL,
      }),
    ).toThrow(`RETRIEVAL_INGEST_CONFIRM=${retrievalIngestConfirmation}`)
  })

  it.each(['DATABASE_URL', 'VOYAGE_API_KEY', 'VOYAGE_EMBEDDING_MODEL'] as const)(
    'requires %s',
    (missingKey) => {
      const environment = { ...validEnvironment, [missingKey]: undefined }
      expect(() => retrievalIngestConfiguration(environment)).toThrow(`Set ${missingKey}`)
    },
  )

  it('returns trimmed configuration for an explicitly confirmed non-production environment', () => {
    expect(
      retrievalIngestConfiguration({
        ...validEnvironment,
        DATABASE_URL: ` ${validEnvironment.DATABASE_URL} `,
        VOYAGE_API_KEY: ` ${validEnvironment.VOYAGE_API_KEY} `,
        VOYAGE_EMBEDDING_MODEL: ` ${validEnvironment.VOYAGE_EMBEDDING_MODEL} `,
      }),
    ).toEqual({
      apiKey: validEnvironment.VOYAGE_API_KEY,
      databaseUrl: validEnvironment.DATABASE_URL,
      embeddingModel: validEnvironment.VOYAGE_EMBEDDING_MODEL,
    })
  })
})
