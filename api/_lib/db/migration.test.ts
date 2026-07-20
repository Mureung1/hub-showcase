import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationRoot = join(process.cwd(), 'drizzle')
const migrationEntries = readdirSync(migrationRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({
    name: entry.name,
    sql: readFileSync(join(migrationRoot, entry.name, 'migration.sql'), 'utf8'),
  }))
const migrationSql = migrationEntries
  .map((entry) => entry.sql)
  .join('\n')
const interactionMigration = migrationEntries.find((entry) =>
  entry.sql.includes('CREATE TABLE "interaction_events"'),
)

describe('T30 core, T35 retrieval, and T36 interaction migrations', () => {
  it('preserves existing tables and adds the interaction metadata table', () => {
    const createdTables = [...migrationSql.matchAll(/CREATE TABLE "([^"]+)"/gu)].map(
      (match) => match[1],
    )

    expect(createdTables.sort()).toEqual([
      'evaluation_runs',
      'generation_runs',
      'interaction_events',
      'prompt_versions',
      'retrieval_examples',
      'template_versions',
    ])
    expect(migrationSql).toContain('FOREIGN KEY ("prompt_version_id")')
    expect(migrationSql).toContain('generation_runs_status_created_at_idx')
    expect(migrationSql).toContain('evaluation_runs_case_model_prompt_repeat_unique')
    expect(migrationSql).toContain('generation_runs_route_version_boundary')
    expect(migrationSql).toContain('CREATE EXTENSION IF NOT EXISTS vector')
    expect(migrationSql).toContain('"embedding" vector(1024) NOT NULL')
    expect(migrationSql).toContain('retrieval_examples_filter_idx')
    expect(migrationSql).toContain('retrieval_examples_identity_pk')
    expect(migrationSql).toContain('retrieval_examples_embedding_nonzero')
    expect(migrationSql).toContain('vector_norm("embedding") > 0')
    expect(migrationSql).toContain('CREATE TYPE "interaction_event_name"')
    expect(migrationSql).toContain('CREATE TYPE "interaction_result_route"')
    expect(migrationSql).toContain('CREATE TYPE "situation_id"')
    expect(migrationSql).toContain('interaction_events_route_situation_boundary')
    expect(migrationSql).toContain('interaction_events_scenario_situation_boundary')
    expect(migrationSql).toContain('interaction_events_copy_tone_boundary')
    expect(migrationSql).toContain(
      '"event_name" = \'copy_succeeded\' and "tone_level" is not null and "tone_level" between 1 and 3',
    )
    expect(migrationSql).toContain('interaction_events_email_professor_boundary')
    expect(migrationSql).not.toMatch(/USING (hnsw|ivfflat)/iu)
  })

  it('does not create content, user, session, IP, or hash columns', () => {
    expect(migrationSql).not.toMatch(
      /received_message|situation_text|candidate_text|edited_text|generated_text|message_hash|query_vector|query_embedding|ip_address|user_id|session_id|device_id|metadata json/iu,
    )
  })

  it('keeps the T36 migration additive and metadata-only', () => {
    expect(interactionMigration).toBeDefined()
    const sql = interactionMigration?.sql ?? ''
    const createdTables = [...sql.matchAll(/CREATE TABLE "([^"]+)"/gu)].map(
      (match) => match[1],
    )
    const createdTypes = [...sql.matchAll(/CREATE TYPE "([^"]+)"/gu)].map(
      (match) => match[1],
    )

    expect(createdTables).toEqual(['interaction_events'])
    expect(createdTypes).toEqual([
      'interaction_event_name',
      'interaction_result_route',
      'situation_id',
    ])
    expect(sql).not.toMatch(/\b(?:ALTER|DROP|DELETE|TRUNCATE|UPDATE)\b/iu)
    expect(sql).not.toMatch(
      /received_message|situation_text|candidate_text|edited_text|generated_text|message_hash|query_vector|query_embedding|ip_address|user_id|session_id|device_id|jsonb?/iu,
    )
  })
})
