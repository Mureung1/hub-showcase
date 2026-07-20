import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import { purposes, scenarios, situationCardsFor } from '../../../src/entities/message'
import { interactionEventNames } from '../../../src/shared/interaction/contracts'
import { generationMetricStatuses } from '../generation/metrics'
import {
  evaluationRuns,
  generationRuns,
  generationStatusValues,
  interactionEvents,
  interactionEventValues,
  interactionResultRouteValues,
  modeValues,
  promptVersions,
  purposeValues,
  retrievalExamples,
  scenarioValues,
  situationValues,
  templateVersions,
} from './schema'

const coreTables = [promptVersions, templateVersions, generationRuns, evaluationRuns]
const tables = [...coreTables, retrievalExamples, interactionEvents]

describe('T30 core, T35 retrieval, and T36 interaction database schema', () => {
  it('preserves the existing tables and adds one interaction metadata table', () => {
    expect(coreTables.map((table) => getTableConfig(table).name).sort()).toEqual([
      'evaluation_runs',
      'generation_runs',
      'prompt_versions',
      'template_versions',
    ])
    expect(tables.map((table) => getTableConfig(table).name).sort()).toEqual([
      'evaluation_runs',
      'generation_runs',
      'interaction_events',
      'prompt_versions',
      'retrieval_examples',
      'template_versions',
    ])
  })

  it('contains no content or persistent user-identification columns', () => {
    const columnNames = tables.flatMap((table) =>
      getTableConfig(table).columns.map((column) => column.name),
    )
    const serializedColumns = columnNames.join(' ')

    expect(serializedColumns).not.toMatch(
      /received|situation_text|candidate|edited|generated|message_hash|message_text|query|ip_address|user_id|session_id|device_id|metadata/u,
    )
  })

  it('keeps interaction storage to the approved aggregate metadata and DB boundaries', () => {
    const config = getTableConfig(interactionEvents)

    expect(config.columns.map((column) => column.name)).toEqual([
      'event_name',
      'route',
      'scenario_id',
      'mode',
      'situation_id',
      'tone_level',
      'created_at',
    ])
    expect(config.checks.map((constraint) => constraint.name)).toEqual([
      'interaction_events_route_situation_boundary',
      'interaction_events_scenario_situation_boundary',
      'interaction_events_copy_tone_boundary',
      'interaction_events_email_professor_boundary',
    ])
  })

  it('keeps retrieval storage to the approved metadata and 1024-dimension vector', () => {
    const config = getTableConfig(retrievalExamples)
    const columns = config.columns

    expect(columns.map((column) => column.name)).toEqual([
      'example_id',
      'catalog_version',
      'embedding_model',
      'scenario_id',
      'purpose_id',
      'mode',
      'embedding',
      'checksum',
      'review_status',
      'reviewed_at',
    ])
    expect(columns.find((column) => column.name === 'embedding')?.getSQLType()).toBe(
      'vector(1024)',
    )
    expect(config.primaryKeys.map((primaryKey) => primaryKey.getName())).toEqual([
      'retrieval_examples_identity_pk',
    ])
    expect(config.checks.map((constraint) => constraint.name)).toContain(
      'retrieval_examples_embedding_nonzero',
    )
  })

  it('keeps database enums aligned with runtime domain contracts', () => {
    expect(generationStatusValues).toEqual(generationMetricStatuses)
    expect(scenarioValues).toEqual(scenarios.map((scenario) => scenario.id))
    expect(purposeValues).toEqual(purposes.map((purpose) => purpose.id))
    expect(modeValues).toEqual(['reply', 'initiate'])
    expect(interactionEventValues).toEqual(interactionEventNames)
    expect(interactionResultRouteValues).toEqual([
      'template_fallback',
      'guided_ai',
      'manual_ai',
      'email_template',
    ])
    expect(situationValues).toEqual([
      ...new Set(scenarios.flatMap((scenario) => situationCardsFor(scenario.id).map((card) => card.id))),
    ])
  })
})
