import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { config } from 'dotenv'
import { eq, sql } from 'drizzle-orm'
import { createDatabase } from '../api/_lib/db/database'
import { createDatabaseGenerationMetricsSink } from '../api/_lib/db/generationMetricsSink'
import {
  createDataRepositories,
  createDrizzleDataWriters,
} from '../api/_lib/db/repositories'
import {
  evaluationRuns,
  generationRuns,
  promptVersions,
  templateVersions,
} from '../api/_lib/db/schema'
import { createGenerateHandler } from '../api/_lib/generation/handler'
import { createInMemoryRateLimiter } from '../api/_lib/generation/rateLimiter'
import { databaseUrlForSmoke } from './dbSmokeEnvironment'

config({ path: '.env.local', quiet: true })

const runSmokeTest = async () => {
  const database = createDatabase(databaseUrlForSmoke(process.env))
  const repositories = createDataRepositories(createDrizzleDataWriters(database))
  const smokeTag = `t30-smoke-${Date.now()}-${randomUUID().slice(0, 8)}`
  const checksum = createHash('sha256').update(smokeTag).digest('hex')
  const model = 't30-smoke-model'
  let evaluationRunId: string | undefined
  let generationRunId: string | undefined
  let handlerGenerationRunId: string | undefined
  let promptVersionId: string | undefined
  let templateVersionId: string | undefined

  try {
    const publicTables = await database.execute<{ tableName: string }>(sql`
      select table_name as "tableName"
      from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name
    `)
    assert.deepEqual(
      publicTables.rows.map((row) => row.tableName),
      ['evaluation_runs', 'generation_runs', 'prompt_versions', 'template_versions'],
    )

    promptVersionId = await repositories.promptVersions.record({
      checksum,
      maxOutputTokens: 128,
      model,
      reviewStatus: 'draft',
      version: `${smokeTag}-prompt`,
    })
    templateVersionId = await repositories.templateVersions.record({
      checksum,
      reviewStatus: 'draft',
      version: `${smokeTag}-template`,
    })
    generationRunId = await repositories.generationRuns.record({
      attemptCount: 1,
      inputTokens: 12,
      latencyMs: 25,
      model,
      outputTokens: 18,
      promptVersionId,
      purposeId: 'ask',
      route: 'ai',
      scenarioId: 'professor',
      status: 'success',
    })
    evaluationRunId = await repositories.evaluationRuns.record({
      caseId: smokeTag,
      estimatedCostMicroUsd: 1,
      inputTokens: 12,
      latencyMs: 25,
      model,
      outputTokens: 18,
      promptVersionId,
      qualityScoreBasisPoints: 10_000,
      repetition: 0,
      sampleCount: 1,
    })

    const [promptRow] = await database
      .select({ checksum: promptVersions.checksum, version: promptVersions.version })
      .from(promptVersions)
      .where(eq(promptVersions.id, promptVersionId))
    const [templateRow] = await database
      .select({ checksum: templateVersions.checksum, version: templateVersions.version })
      .from(templateVersions)
      .where(eq(templateVersions.id, templateVersionId))
    const [generationRow] = await database
      .select({
        latencyMs: generationRuns.latencyMs,
        promptVersionId: generationRuns.promptVersionId,
        route: generationRuns.route,
        status: generationRuns.status,
      })
      .from(generationRuns)
      .where(eq(generationRuns.id, generationRunId))
    const [evaluationRow] = await database
      .select({
        caseId: evaluationRuns.caseId,
        promptVersionId: evaluationRuns.promptVersionId,
        qualityScoreBasisPoints: evaluationRuns.qualityScoreBasisPoints,
      })
      .from(evaluationRuns)
      .where(eq(evaluationRuns.id, evaluationRunId))

    assert.deepEqual(promptRow, { checksum, version: `${smokeTag}-prompt` })
    assert.deepEqual(templateRow, { checksum, version: `${smokeTag}-template` })
    assert.deepEqual(generationRow, {
      latencyMs: 25,
      promptVersionId,
      route: 'ai',
      status: 'success',
    })
    assert.deepEqual(evaluationRow, {
      caseId: smokeTag,
      promptVersionId,
      qualityScoreBasisPoints: 10_000,
    })

    const scheduledTasks: Array<Promise<void>> = []
    const metricsSink = createDatabaseGenerationMetricsSink({
      repository: {
        async record(metric) {
          handlerGenerationRunId = await repositories.generationRuns.record({
            ...metric,
            model,
            promptVersionId,
          })
          return handlerGenerationRunId
        },
      },
      schedule: (task) => scheduledTasks.push(task),
    })
    const handler = createGenerateHandler({
      metricsSink,
      provider: {
        generate: () =>
          Promise.resolve({
            candidates: [
              { text: '스모크 기본 후보', toneLevel: 1 },
              { text: '스모크 부드러운 후보', toneLevel: 2 },
              { text: '스모크 분명한 후보', toneLevel: 3 },
            ],
          }),
      },
      rateLimiter: createInMemoryRateLimiter(),
    })
    const response = await handler(
      new Request('https://example.test/api/generate', {
        body: JSON.stringify({
          purpose: 'ask',
          scenarioId: 'professor',
          speechStyleId: 'seumnida',
          situation: '스모크 테스트용 합성 상황',
        }),
        headers: {
          'content-type': 'application/json',
          'x-vercel-forwarded-for': '192.0.2.50',
        },
        method: 'POST',
      }),
    )

    assert.equal(response.status, 200)
    assert.equal(scheduledTasks.length, 1)
    await scheduledTasks[0]
    assert.ok(handlerGenerationRunId)

    const [handlerGenerationRow] = await database
      .select({
        attemptCount: generationRuns.attemptCount,
        model: generationRuns.model,
        promptVersionId: generationRuns.promptVersionId,
        purposeId: generationRuns.purposeId,
        route: generationRuns.route,
        scenarioId: generationRuns.scenarioId,
        status: generationRuns.status,
      })
      .from(generationRuns)
      .where(eq(generationRuns.id, handlerGenerationRunId))
    assert.deepEqual(handlerGenerationRow, {
      attemptCount: 1,
      model,
      promptVersionId,
      purposeId: 'ask',
      route: 'ai',
      scenarioId: 'professor',
      status: 'success',
    })

  } finally {
    if (evaluationRunId) {
      const deletedRows = await database
        .delete(evaluationRuns)
        .where(eq(evaluationRuns.id, evaluationRunId))
        .returning({ id: evaluationRuns.id })
      assert.deepEqual(deletedRows, [{ id: evaluationRunId }])
    }
    if (generationRunId) {
      const deletedRows = await database
        .delete(generationRuns)
        .where(eq(generationRuns.id, generationRunId))
        .returning({ id: generationRuns.id })
      assert.deepEqual(deletedRows, [{ id: generationRunId }])
    }
    if (handlerGenerationRunId) {
      const deletedRows = await database
        .delete(generationRuns)
        .where(eq(generationRuns.id, handlerGenerationRunId))
        .returning({ id: generationRuns.id })
      assert.deepEqual(deletedRows, [{ id: handlerGenerationRunId }])
    }
    if (templateVersionId) {
      const deletedRows = await database
        .delete(templateVersions)
        .where(eq(templateVersions.id, templateVersionId))
        .returning({ id: templateVersions.id })
      assert.deepEqual(deletedRows, [{ id: templateVersionId }])
    }
    if (promptVersionId) {
      const deletedRows = await database
        .delete(promptVersions)
        .where(eq(promptVersions.id, promptVersionId))
        .returning({ id: promptVersions.id })
      assert.deepEqual(deletedRows, [{ id: promptVersionId }])
    }
  }

  console.log(
    'T30 Neon smoke test passed: handler and four repositories wrote, read, and cleaned metadata rows',
  )
}

await runSmokeTest()
