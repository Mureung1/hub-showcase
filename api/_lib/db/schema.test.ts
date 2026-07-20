import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import { purposes, scenarios } from '../../../src/entities/message'
import { generationMetricStatuses } from '../generation/metrics'
import {
  evaluationRuns,
  generationRuns,
  generationStatusValues,
  modeValues,
  promptVersions,
  purposeValues,
  scenarioValues,
  templateVersions,
} from './schema'

const tables = [promptVersions, templateVersions, generationRuns, evaluationRuns]

describe('T30 database schema', () => {
  it('defines only the four approved metadata tables', () => {
    expect(tables.map((table) => getTableConfig(table).name).sort()).toEqual([
      'evaluation_runs',
      'generation_runs',
      'prompt_versions',
      'template_versions',
    ])
  })

  it('contains no content or persistent user-identification columns', () => {
    const columnNames = tables.flatMap((table) =>
      getTableConfig(table).columns.map((column) => column.name),
    )
    const serializedColumns = columnNames.join(' ')

    expect(serializedColumns).not.toMatch(
      /received|situation|candidate|generated|message_hash|message_text|ip_address|user_id|session_id/u,
    )
  })

  it('keeps database enums aligned with runtime domain contracts', () => {
    expect(generationStatusValues).toEqual(generationMetricStatuses)
    expect(scenarioValues).toEqual(scenarios.map((scenario) => scenario.id))
    expect(purposeValues).toEqual(purposes.map((purpose) => purpose.id))
    expect(modeValues).toEqual(['reply', 'initiate'])
  })
})
