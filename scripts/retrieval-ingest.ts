import { config } from 'dotenv'
import { createDatabase } from '../api/_lib/db/database.js'
import { reviewedRetrievalCatalog } from '../api/_lib/retrieval/catalog.js'
import { ingestReviewedRetrievalCatalog } from '../api/_lib/retrieval/ingestion.js'
import { createDrizzleRetrievalExampleRepository } from '../api/_lib/retrieval/repository.js'
import { createVoyageEmbeddingProvider } from '../api/_lib/retrieval/voyageEmbeddingProvider.js'
import { retrievalIngestConfiguration } from './retrievalIngestEnvironment.js'

config({ path: '.env.local', quiet: true })

const configuration = retrievalIngestConfiguration(process.env)
const database = createDatabase(configuration.databaseUrl)
const result = await ingestReviewedRetrievalCatalog({
  catalog: reviewedRetrievalCatalog,
  embeddingProvider: createVoyageEmbeddingProvider({
    apiKey: configuration.apiKey,
    model: configuration.embeddingModel,
  }),
  repository: createDrizzleRetrievalExampleRepository(database),
})

console.log(
  JSON.stringify({
    catalogVersion: result.catalogVersion,
    embeddingModel: result.embeddingModel,
    insertedCount: result.insertedCount,
    unchangedCount: result.unchangedCount,
  }),
)
