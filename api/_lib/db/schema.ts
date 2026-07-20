import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
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

export const reviewStatusEnum = pgEnum('review_status', reviewStatusValues)
export const generationRouteEnum = pgEnum('generation_route', generationRouteValues)
export const generationStatusEnum = pgEnum('generation_status', generationStatusValues)
export const scenarioEnum = pgEnum('scenario_id', scenarioValues)
export const modeEnum = pgEnum('message_mode', modeValues)
export const purposeEnum = pgEnum('purpose_id', purposeValues)

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

export type PromptVersionRow = typeof promptVersions.$inferSelect
export type NewPromptVersionRow = typeof promptVersions.$inferInsert
export type TemplateVersionRow = typeof templateVersions.$inferSelect
export type NewTemplateVersionRow = typeof templateVersions.$inferInsert
export type GenerationRunRow = typeof generationRuns.$inferSelect
export type NewGenerationRunRow = typeof generationRuns.$inferInsert
export type EvaluationRunRow = typeof evaluationRuns.$inferSelect
export type NewEvaluationRunRow = typeof evaluationRuns.$inferInsert
