import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  vector,
} from 'drizzle-orm/pg-core'

export const reviewStatusValues = ['draft', 'approved', 'retired'] as const
export const generationRouteValues = ['ai', 'template'] as const
export const generationStatusValues = [
  'deadline_exceeded',
  'invalid_request',
  'invalid_response',
  'provider_client_error',
  'provider_error',
  'provider_rate_limited',
  'provider_transient_error',
  'provider_unconfigured',
  'rate_limited',
  'success',
  'unsafe_response',
] as const
export const scenarioValues = ['groupwork', 'professor', 'senior', 'friend'] as const
export const modeValues = ['reply', 'initiate'] as const
export const purposeValues = ['ask', 'apologize', 'decline', 'question', 'suggest', 'other'] as const
export const interactionEventValues = [
  'result_shown',
  'refinement_opened',
  'regeneration_requested',
  'copy_succeeded',
  'situation_change',
] as const
export const interactionResultRouteValues = [
  'template_fallback',
  'guided_ai',
  'manual_ai',
  'email_template',
] as const
export const situationValues = [
  'schedule',
  'thanks_check',
  'ask',
  'apologize',
  'decline',
  'contribution_check',
  'absence_inquiry',
  'casual_request',
  'express_feelings',
] as const

export const reviewStatusEnum = pgEnum('review_status', reviewStatusValues)
export const generationRouteEnum = pgEnum('generation_route', generationRouteValues)
export const generationStatusEnum = pgEnum('generation_status', generationStatusValues)
export const scenarioEnum = pgEnum('scenario_id', scenarioValues)
export const modeEnum = pgEnum('message_mode', modeValues)
export const purposeEnum = pgEnum('purpose_id', purposeValues)
export const interactionEventEnum = pgEnum('interaction_event_name', interactionEventValues)
export const interactionResultRouteEnum = pgEnum(
  'interaction_result_route',
  interactionResultRouteValues,
)
export const situationEnum = pgEnum('situation_id', situationValues)

const createdAtColumn = () =>
  timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull()

export const promptVersions = pgTable(
  'prompt_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    version: varchar('version', { length: 64 }).notNull(),
    checksum: varchar('checksum', { length: 64 }).notNull(),
    model: varchar('model', { length: 128 }).notNull(),
    maxOutputTokens: integer('max_output_tokens').notNull(),
    temperatureMilli: smallint('temperature_milli'),
    reviewStatus: reviewStatusEnum('review_status').default('draft').notNull(),
    reviewedAt: timestamp('reviewed_at', { mode: 'date', withTimezone: true }),
    isActive: boolean('is_active').default(false).notNull(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex('prompt_versions_version_unique').on(table.version),
    uniqueIndex('prompt_versions_single_active').on(table.isActive).where(sql`${table.isActive} = true`),
    check('prompt_versions_version_nonempty', sql`length(trim(${table.version})) > 0`),
    check('prompt_versions_checksum_sha256', sql`${table.checksum} ~ '^[0-9a-f]{64}$'`),
    check('prompt_versions_model_nonempty', sql`length(trim(${table.model})) > 0`),
    check('prompt_versions_max_output_tokens_positive', sql`${table.maxOutputTokens} > 0`),
    check(
      'prompt_versions_temperature_milli_range',
      sql`${table.temperatureMilli} is null or ${table.temperatureMilli} between 0 and 2000`,
    ),
    check(
      'prompt_versions_approved_has_review_time',
      sql`${table.reviewStatus} <> 'approved' or ${table.reviewedAt} is not null`,
    ),
    check(
      'prompt_versions_active_is_approved',
      sql`${table.isActive} = false or ${table.reviewStatus} = 'approved'`,
    ),
  ],
)

export const templateVersions = pgTable(
  'template_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    version: varchar('version', { length: 64 }).notNull(),
    checksum: varchar('checksum', { length: 64 }).notNull(),
    reviewStatus: reviewStatusEnum('review_status').default('draft').notNull(),
    reviewedAt: timestamp('reviewed_at', { mode: 'date', withTimezone: true }),
    isActive: boolean('is_active').default(false).notNull(),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex('template_versions_version_unique').on(table.version),
    uniqueIndex('template_versions_single_active').on(table.isActive).where(sql`${table.isActive} = true`),
    check('template_versions_version_nonempty', sql`length(trim(${table.version})) > 0`),
    check('template_versions_checksum_sha256', sql`${table.checksum} ~ '^[0-9a-f]{64}$'`),
    check(
      'template_versions_approved_has_review_time',
      sql`${table.reviewStatus} <> 'approved' or ${table.reviewedAt} is not null`,
    ),
    check(
      'template_versions_active_is_approved',
      sql`${table.isActive} = false or ${table.reviewStatus} = 'approved'`,
    ),
  ],
)

export const generationRuns = pgTable(
  'generation_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    route: generationRouteEnum('route').notNull(),
    scenarioId: scenarioEnum('scenario_id'),
    mode: modeEnum('mode'),
    purposeId: purposeEnum('purpose_id'),
    status: generationStatusEnum('status').notNull(),
    model: varchar('model', { length: 128 }),
    promptVersionId: uuid('prompt_version_id').references(() => promptVersions.id, {
      onDelete: 'restrict',
    }),
    templateVersionId: uuid('template_version_id').references(() => templateVersions.id, {
      onDelete: 'restrict',
    }),
    latencyMs: integer('latency_ms').notNull(),
    attemptCount: smallint('attempt_count').notNull(),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index('generation_runs_created_at_idx').on(table.createdAt),
    index('generation_runs_status_created_at_idx').on(table.status, table.createdAt),
    index('generation_runs_prompt_version_created_at_idx').on(table.promptVersionId, table.createdAt),
    index('generation_runs_scenario_created_at_idx').on(table.scenarioId, table.createdAt),
    check('generation_runs_latency_nonnegative', sql`${table.latencyMs} >= 0`),
    check('generation_runs_attempt_count_nonnegative', sql`${table.attemptCount} >= 0`),
    check('generation_runs_input_tokens_nonnegative', sql`${table.inputTokens} is null or ${table.inputTokens} >= 0`),
    check('generation_runs_output_tokens_nonnegative', sql`${table.outputTokens} is null or ${table.outputTokens} >= 0`),
    check(
      'generation_runs_model_nonempty',
      sql`${table.model} is null or length(trim(${table.model})) > 0`,
    ),
    check(
      'generation_runs_route_version_boundary',
      sql`(${table.route} = 'ai' and ${table.templateVersionId} is null) or (${table.route} = 'template' and ${table.promptVersionId} is null and ${table.model} is null and ${table.purposeId} is null)`,
    ),
  ],
)

export const evaluationRuns = pgTable(
  'evaluation_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    caseId: varchar('case_id', { length: 96 }).notNull(),
    model: varchar('model', { length: 128 }).notNull(),
    promptVersionId: uuid('prompt_version_id')
      .notNull()
      .references(() => promptVersions.id, { onDelete: 'restrict' }),
    repetition: smallint('repetition').notNull(),
    sampleCount: integer('sample_count').notNull(),
    qualityScoreBasisPoints: integer('quality_score_basis_points').notNull(),
    latencyMs: integer('latency_ms').notNull(),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    estimatedCostMicroUsd: integer('estimated_cost_micro_usd'),
    createdAt: createdAtColumn(),
  },
  (table) => [
    uniqueIndex('evaluation_runs_case_model_prompt_repeat_unique').on(
      table.caseId,
      table.model,
      table.promptVersionId,
      table.repetition,
    ),
    index('evaluation_runs_prompt_version_created_at_idx').on(table.promptVersionId, table.createdAt),
    check('evaluation_runs_case_id_nonempty', sql`length(trim(${table.caseId})) > 0`),
    check('evaluation_runs_model_nonempty', sql`length(trim(${table.model})) > 0`),
    check('evaluation_runs_repetition_nonnegative', sql`${table.repetition} >= 0`),
    check('evaluation_runs_sample_count_positive', sql`${table.sampleCount} > 0`),
    check(
      'evaluation_runs_quality_score_basis_points_range',
      sql`${table.qualityScoreBasisPoints} between 0 and 10000`,
    ),
    check('evaluation_runs_latency_nonnegative', sql`${table.latencyMs} >= 0`),
    check('evaluation_runs_input_tokens_nonnegative', sql`${table.inputTokens} is null or ${table.inputTokens} >= 0`),
    check('evaluation_runs_output_tokens_nonnegative', sql`${table.outputTokens} is null or ${table.outputTokens} >= 0`),
    check(
      'evaluation_runs_estimated_cost_nonnegative',
      sql`${table.estimatedCostMicroUsd} is null or ${table.estimatedCostMicroUsd} >= 0`,
    ),
  ],
)

export const retrievalExamples = pgTable(
  'retrieval_examples',
  {
    exampleId: varchar('example_id', { length: 96 }).notNull(),
    catalogVersion: varchar('catalog_version', { length: 64 }).notNull(),
    embeddingModel: varchar('embedding_model', { length: 128 }).notNull(),
    scenarioId: scenarioEnum('scenario_id').notNull(),
    purposeId: purposeEnum('purpose_id').notNull(),
    mode: modeEnum('mode').notNull(),
    embedding: vector('embedding', { dimensions: 1024 }).notNull(),
    checksum: varchar('checksum', { length: 64 }).notNull(),
    reviewStatus: reviewStatusEnum('review_status').notNull(),
    reviewedAt: timestamp('reviewed_at', { mode: 'date', withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.exampleId, table.catalogVersion, table.embeddingModel],
      name: 'retrieval_examples_identity_pk',
    }),
    index('retrieval_examples_filter_idx').on(
      table.catalogVersion,
      table.embeddingModel,
      table.reviewStatus,
      table.scenarioId,
      table.purposeId,
      table.mode,
    ),
    check('retrieval_examples_example_id_nonempty', sql`length(trim(${table.exampleId})) > 0`),
    check(
      'retrieval_examples_catalog_version_nonempty',
      sql`length(trim(${table.catalogVersion})) > 0`,
    ),
    check(
      'retrieval_examples_embedding_model_nonempty',
      sql`length(trim(${table.embeddingModel})) > 0`,
    ),
    check('retrieval_examples_checksum_sha256', sql`${table.checksum} ~ '^[0-9a-f]{64}$'`),
    check('retrieval_examples_embedding_nonzero', sql`vector_norm(${table.embedding}) > 0`),
  ],
)

export const interactionEvents = pgTable(
  'interaction_events',
  {
    eventName: interactionEventEnum('event_name').notNull(),
    route: interactionResultRouteEnum('route').notNull(),
    scenarioId: scenarioEnum('scenario_id').notNull(),
    mode: modeEnum('mode').notNull(),
    situationId: situationEnum('situation_id'),
    toneLevel: smallint('tone_level'),
    createdAt: createdAtColumn(),
  },
  (table) => [
    index('interaction_events_created_at_idx').on(table.createdAt),
    index('interaction_events_route_created_at_idx').on(table.route, table.createdAt),
    index('interaction_events_scenario_created_at_idx').on(table.scenarioId, table.createdAt),
    check(
      'interaction_events_route_situation_boundary',
      sql`(${table.route} in ('guided_ai', 'template_fallback') and ${table.situationId} is not null) or (${table.route} in ('manual_ai', 'email_template') and ${table.situationId} is null)`,
    ),
    check(
      'interaction_events_scenario_situation_boundary',
      sql`${table.situationId} is null or ${table.situationId} in ('schedule', 'thanks_check', 'ask', 'apologize', 'decline') or (${table.scenarioId} = 'groupwork' and ${table.situationId} = 'contribution_check') or (${table.scenarioId} = 'professor' and ${table.situationId} = 'absence_inquiry') or (${table.scenarioId} = 'senior' and ${table.situationId} = 'casual_request') or (${table.scenarioId} = 'friend' and ${table.situationId} = 'express_feelings')`,
    ),
    check(
      'interaction_events_copy_tone_boundary',
      sql`(${table.eventName} = 'copy_succeeded' and ${table.toneLevel} is not null and ${table.toneLevel} between 1 and 3) or (${table.eventName} <> 'copy_succeeded' and ${table.toneLevel} is null)`,
    ),
    check(
      'interaction_events_email_professor_boundary',
      sql`${table.route} <> 'email_template' or ${table.scenarioId} = 'professor'`,
    ),
  ],
)

export type PromptVersionRow = typeof promptVersions.$inferSelect
export type NewPromptVersionRow = typeof promptVersions.$inferInsert
export type TemplateVersionRow = typeof templateVersions.$inferSelect
export type NewTemplateVersionRow = typeof templateVersions.$inferInsert
export type GenerationRunRow = typeof generationRuns.$inferSelect
export type NewGenerationRunRow = typeof generationRuns.$inferInsert
export type EvaluationRunRow = typeof evaluationRuns.$inferSelect
export type NewEvaluationRunRow = typeof evaluationRuns.$inferInsert
export type RetrievalExampleRow = typeof retrievalExamples.$inferSelect
export type NewRetrievalExampleRow = typeof retrievalExamples.$inferInsert
export type InteractionEventRow = typeof interactionEvents.$inferSelect
export type NewInteractionEventRow = typeof interactionEvents.$inferInsert
