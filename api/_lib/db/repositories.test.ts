import { describe, expect, it } from 'vitest'
import type {
  NewEvaluationRunRow,
  NewGenerationRunRow,
  NewPromptVersionRow,
  NewTemplateVersionRow,
} from './schema'
import { createDataRepositories, type DataWriters } from './repositories'

const createCapturingWriters = () => {
  const evaluationRows: NewEvaluationRunRow[] = []
  const generationRows: NewGenerationRunRow[] = []
  const promptRows: NewPromptVersionRow[] = []
  const templateRows: NewTemplateVersionRow[] = []
  const writers: DataWriters = {
    insertEvaluationRun(row) {
      evaluationRows.push(row)
      return Promise.resolve('evaluation-id')
    },
    insertGenerationRun(row) {
      generationRows.push(row)
      return Promise.resolve('generation-id')
    },
    insertPromptVersion(row) {
      promptRows.push(row)
      return Promise.resolve('prompt-id')
    },
    insertTemplateVersion(row) {
      templateRows.push(row)
      return Promise.resolve('template-id')
    },
  }

  return { evaluationRows, generationRows, promptRows, templateRows, writers }
}

describe('T30 data repositories', () => {
  it('maps a generation metric through an explicit allowlist', async () => {
    const captured = createCapturingWriters()
    const repository = createDataRepositories(captured.writers).generationRuns
    const unsafeCallerValue = {
      attemptCount: 1,
      candidateText: '저장하면 안 되는 생성 문구',
      clientKey: '198.51.100.2',
      latencyMs: 842,
      purposeId: 'ask' as const,
      receivedMessage: '저장하면 안 되는 받은 메시지',
      route: 'ai' as const,
      scenarioId: 'professor' as const,
      situation: '저장하면 안 되는 상황 설명',
      status: 'success' as const,
    }

    await expect(repository.record(unsafeCallerValue)).resolves.toBe('generation-id')

    expect(captured.generationRows).toEqual([
      {
        attemptCount: 1,
        latencyMs: 842,
        purposeId: 'ask',
        route: 'ai',
        scenarioId: 'professor',
        status: 'success',
      },
    ])
    const serializedRow = JSON.stringify(captured.generationRows)
    expect(serializedRow).not.toContain(unsafeCallerValue.receivedMessage)
    expect(serializedRow).not.toContain(unsafeCallerValue.situation)
    expect(serializedRow).not.toContain(unsafeCallerValue.candidateText)
    expect(serializedRow).not.toContain(unsafeCallerValue.clientKey)
  })

  it('records version and aggregate evaluation metadata without bodies or examples', async () => {
    const captured = createCapturingWriters()
    const repositories = createDataRepositories(captured.writers)
    const reviewedAt = new Date('2026-07-20T00:00:00.000Z')

    await repositories.promptVersions.record({
      checksum: 'a'.repeat(64),
      isActive: true,
      maxOutputTokens: 1024,
      model: 'model-version',
      reviewedAt,
      reviewStatus: 'approved',
      temperatureMilli: 400,
      version: 'prompt-v1',
    })
    await repositories.templateVersions.record({
      checksum: 'b'.repeat(64),
      reviewedAt,
      reviewStatus: 'approved',
      version: 'template-v1',
    })
    await repositories.evaluationRuns.record({
      caseId: 'holdout-01',
      estimatedCostMicroUsd: 350,
      inputTokens: 120,
      latencyMs: 640,
      model: 'model-version',
      outputTokens: 80,
      promptVersionId: '00000000-0000-4000-8000-000000000001',
      qualityScoreBasisPoints: 9200,
      repetition: 1,
      sampleCount: 8,
    })

    expect(captured.promptRows[0]).toMatchObject({ version: 'prompt-v1' })
    expect(captured.templateRows[0]).toMatchObject({ version: 'template-v1' })
    expect(captured.evaluationRows[0]).toEqual({
      caseId: 'holdout-01',
      estimatedCostMicroUsd: 350,
      inputTokens: 120,
      latencyMs: 640,
      model: 'model-version',
      outputTokens: 80,
      promptVersionId: '00000000-0000-4000-8000-000000000001',
      qualityScoreBasisPoints: 9200,
      repetition: 1,
      sampleCount: 8,
    })
  })
})
