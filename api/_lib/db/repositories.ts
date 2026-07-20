import type { GenerationMetric } from '../generation/metrics'
import type { DabnyangiDatabase } from './database'
import {
  evaluationRuns,
  generationRuns,
  promptVersions,
  reviewStatusValues,
  templateVersions,
  type NewEvaluationRunRow,
  type NewGenerationRunRow,
  type NewPromptVersionRow,
  type NewTemplateVersionRow,
} from './schema'

type ReviewStatus = (typeof reviewStatusValues)[number]

export type PromptVersionInput = {
  checksum: string
  isActive?: boolean
  maxOutputTokens: number
  model: string
  reviewedAt?: Date
  reviewStatus: ReviewStatus
  temperatureMilli?: number
  version: string
}

export type TemplateVersionInput = {
  checksum: string
  isActive?: boolean
  reviewedAt?: Date
  reviewStatus: ReviewStatus
  version: string
}

export type GenerationRunInput = GenerationMetric & {
  inputTokens?: number
  mode?: 'initiate' | 'reply'
  model?: string
  outputTokens?: number
  promptVersionId?: string
  templateVersionId?: string
}

export type EvaluationRunInput = {
  caseId: string
  estimatedCostMicroUsd?: number
  inputTokens?: number
  latencyMs: number
  model: string
  outputTokens?: number
  promptVersionId: string
  qualityScoreBasisPoints: number
  repetition: number
  sampleCount: number
}

export type DataWriters = {
  insertEvaluationRun: (row: NewEvaluationRunRow) => Promise<string>
  insertGenerationRun: (row: NewGenerationRunRow) => Promise<string>
  insertPromptVersion: (row: NewPromptVersionRow) => Promise<string>
  insertTemplateVersion: (row: NewTemplateVersionRow) => Promise<string>
}

const insertedId = (rows: Array<{ id: string }>) => {
  const firstRow = rows[0]
  if (!firstRow) throw new Error('Database insert returned no id')
  return firstRow.id
}

export const createDrizzleDataWriters = (database: DabnyangiDatabase): DataWriters => ({
  async insertEvaluationRun(row) {
    const rows = await database.insert(evaluationRuns).values(row).returning({ id: evaluationRuns.id })
    return insertedId(rows)
  },
  async insertGenerationRun(row) {
    const rows = await database.insert(generationRuns).values(row).returning({ id: generationRuns.id })
    return insertedId(rows)
  },
  async insertPromptVersion(row) {
    const rows = await database.insert(promptVersions).values(row).returning({ id: promptVersions.id })
    return insertedId(rows)
  },
  async insertTemplateVersion(row) {
    const rows = await database.insert(templateVersions).values(row).returning({ id: templateVersions.id })
    return insertedId(rows)
  },
})

export const toPromptVersionRow = (input: PromptVersionInput): NewPromptVersionRow => ({
  checksum: input.checksum,
  isActive: input.isActive ?? false,
  maxOutputTokens: input.maxOutputTokens,
  model: input.model,
  reviewStatus: input.reviewStatus,
  version: input.version,
  ...(input.reviewedAt ? { reviewedAt: input.reviewedAt } : {}),
  ...(input.temperatureMilli === undefined
    ? {}
    : { temperatureMilli: input.temperatureMilli }),
})

export const toTemplateVersionRow = (input: TemplateVersionInput): NewTemplateVersionRow => ({
  checksum: input.checksum,
  isActive: input.isActive ?? false,
  reviewStatus: input.reviewStatus,
  version: input.version,
  ...(input.reviewedAt ? { reviewedAt: input.reviewedAt } : {}),
})

export const toGenerationRunRow = (input: GenerationRunInput): NewGenerationRunRow => ({
  attemptCount: input.attemptCount,
  latencyMs: input.latencyMs,
  route: input.route,
  status: input.status,
  ...(input.inputTokens === undefined ? {} : { inputTokens: input.inputTokens }),
  ...(input.mode ? { mode: input.mode } : {}),
  ...(input.model ? { model: input.model } : {}),
  ...(input.outputTokens === undefined ? {} : { outputTokens: input.outputTokens }),
  ...(input.promptVersionId ? { promptVersionId: input.promptVersionId } : {}),
  ...(input.purposeId ? { purposeId: input.purposeId } : {}),
  ...(input.scenarioId ? { scenarioId: input.scenarioId } : {}),
  ...(input.templateVersionId ? { templateVersionId: input.templateVersionId } : {}),
})

export const toEvaluationRunRow = (input: EvaluationRunInput): NewEvaluationRunRow => ({
  caseId: input.caseId,
  latencyMs: input.latencyMs,
  model: input.model,
  promptVersionId: input.promptVersionId,
  qualityScoreBasisPoints: input.qualityScoreBasisPoints,
  repetition: input.repetition,
  sampleCount: input.sampleCount,
  ...(input.estimatedCostMicroUsd === undefined
    ? {}
    : { estimatedCostMicroUsd: input.estimatedCostMicroUsd }),
  ...(input.inputTokens === undefined ? {} : { inputTokens: input.inputTokens }),
  ...(input.outputTokens === undefined ? {} : { outputTokens: input.outputTokens }),
})

export const createDataRepositories = (writers: DataWriters) => ({
  evaluationRuns: {
    record: (input: EvaluationRunInput) => writers.insertEvaluationRun(toEvaluationRunRow(input)),
  },
  generationRuns: {
    record: (input: GenerationRunInput) => writers.insertGenerationRun(toGenerationRunRow(input)),
  },
  promptVersions: {
    record: (input: PromptVersionInput) => writers.insertPromptVersion(toPromptVersionRow(input)),
  },
  templateVersions: {
    record: (input: TemplateVersionInput) =>
      writers.insertTemplateVersion(toTemplateVersionRow(input)),
  },
})

export type DataRepositories = ReturnType<typeof createDataRepositories>
export type GenerationRunRepository = DataRepositories['generationRuns']
