import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { config } from 'dotenv'
import { and, eq } from 'drizzle-orm'
import { createDatabase } from '../api/_lib/db/database.js'
import { retrievalExamples } from '../api/_lib/db/schema.js'
import { createDrizzleRetrievalExampleRepository } from '../api/_lib/retrieval/repository.js'
import { createVoyageEmbeddingProvider } from '../api/_lib/retrieval/voyageEmbeddingProvider.js'
import { retrievalIngestConfiguration } from './retrievalIngestEnvironment.js'

config({ path: '.env.local', quiet: true })

const configuration = retrievalIngestConfiguration(process.env)
const database = createDatabase(configuration.databaseUrl)
const embeddingProvider = createVoyageEmbeddingProvider({
  apiKey: configuration.apiKey,
  model: configuration.embeddingModel,
})
const repository = createDrizzleRetrievalExampleRepository(database)
const catalogVersion = `t35-smoke-${Date.now()}-${randomUUID().slice(0, 8)}`
const reviewedAt = new Date()
const documents = [
  {
    exampleId: 't35-smoke-groupwork-availability',
    text: '관계: groupwork\n목적: ask\n방식: reply\n상황: 팀원이 가능한 시간을 물어본다.',
  },
  {
    exampleId: 't35-smoke-groupwork-progress',
    text: '관계: groupwork\n목적: ask\n방식: reply\n상황: 팀원에게 맡은 작업의 진행 상황을 묻는다.',
  },
] as const
let insertedCount = 0
let resultCount = 0

try {
  const documentEmbeddings = embeddingProvider.embedMany
    ? await embeddingProvider.embedMany({
        inputs: documents.map((document) => document.text),
        inputType: 'document',
      })
    : await Promise.all(
        documents.map((document) =>
          embeddingProvider.embed({
            input: document.text,
            inputType: 'document',
          }),
        ),
      )
  assert.equal(documentEmbeddings.length, documents.length)

  for (const [index, document] of documents.entries()) {
    const embedding = documentEmbeddings[index]
    if (!embedding) throw new Error('Smoke document embedding missing')
    await repository.upsertApproved({
      catalogVersion,
      checksum: createHash('sha256').update(document.text).digest('hex'),
      embedding,
      embeddingModel: embeddingProvider.model,
      exampleId: document.exampleId,
      mode: 'reply',
      purposeId: 'ask',
      reviewStatus: 'approved',
      reviewedAt,
      scenarioId: 'groupwork',
    })
    insertedCount += 1
  }

  const queryEmbedding = await embeddingProvider.embed({
    input: '팀원에게 언제 시간이 되는지 답장을 보내고 싶다.',
    inputType: 'query',
  })
  const results = await repository.searchApprovedPair({
    catalogVersion,
    embeddingModel: embeddingProvider.model,
    mode: 'reply',
    purposeId: 'ask',
    queryEmbedding,
    scenarioId: 'groupwork',
  })

  assert.equal(results.length, documents.length)
  assert.deepEqual(
    new Set(results.map((result) => result.exampleId)),
    new Set(documents.map((document) => document.exampleId)),
  )
  assert.ok(results.every((result) => Number.isFinite(result.distance)))
  resultCount = results.length
} finally {
  const deletedRows = await database
    .delete(retrievalExamples)
    .where(
      and(
        eq(retrievalExamples.catalogVersion, catalogVersion),
        eq(retrievalExamples.embeddingModel, embeddingProvider.model),
      ),
    )
    .returning({ exampleId: retrievalExamples.exampleId })

  assert.equal(deletedRows.length, insertedCount)
}

console.log(
  JSON.stringify({
    catalogVersion,
    embeddingModel: embeddingProvider.model,
    resultCount,
    status: 'passed',
  }),
)
