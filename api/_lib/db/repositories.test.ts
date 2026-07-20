import { describe, expect, it } from 'vitest'
import type {
  NewEvaluationRunRow,
  NewGenerationRunRow,
  NewInteractionEventRow,
  NewPromptVersionRow,
  NewTemplateVersionRow,
} from './schema'
import { createDataRepositories, type DataWriters } from './repositories'

const createCapturingWriters = () => {
  const evaluationRows: NewEvaluationRunRow[] = []
  const generationRows: NewGenerationRunRow[] = []
  const interactionRows: NewInteractionEventRow[] = []
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
    insertInteractionEvent(row) {
      interactionRows.push(row)
      return Promise.resolve()
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

  return { evaluationRows, generationRows, interactionRows, promptRows, templateRows, writers }
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

  it('maps an interaction through the metadata allowlist without content or identifiers', async () => {
    const captured = createCapturingWriters()
    const repository = createDataRepositories(captured.writers).interactionEvents
    const unsafeCallerValue = {
      candidate: '저장하면 안 되는 후보',
      deviceId: 'persistent-device',
      editedText: '저장하면 안 되는 수정문',
      eventName: 'copy_succeeded' as const,
      ip: '198.51.100.5',
      mode: 'reply' as const,
      receivedMessage: '저장하면 안 되는 받은 메시지',
      route: 'guided_ai' as const,
      scenarioId: 'groupwork' as const,
      sessionId: 'persistent-session',
      situation: '저장하면 안 되는 상황 설명',
      situationId: 'schedule' as const,
      toneLevel: 2 as const,
      userId: 'persistent-user',
    }

    await expect(repository.record(unsafeCallerValue)).resolves.toBeUndefined()

    expect(captured.interactionRows).toEqual([
      {
        eventName: 'copy_succeeded',
        mode: 'reply',
        route: 'guided_ai',
        scenarioId: 'groupwork',
        situationId: 'schedule',
        toneLevel: 2,
      },
    ])
    const serializedRow = JSON.stringify(captured.interactionRows)
    expect(serializedRow).not.toContain(unsafeCallerValue.receivedMessage)
    expect(serializedRow).not.toContain(unsafeCallerValue.situation)
    expect(serializedRow).not.toContain(unsafeCallerValue.candidate)
    expect(serializedRow).not.toContain(unsafeCallerValue.editedText)
    expect(serializedRow).not.toContain(unsafeCallerValue.ip)
    expect(serializedRow).not.toContain(unsafeCallerValue.userId)
    expect(serializedRow).not.toContain(unsafeCallerValue.sessionId)
    expect(serializedRow).not.toContain(unsafeCallerValue.deviceId)
  })
})
