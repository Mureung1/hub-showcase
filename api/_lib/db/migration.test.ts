import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationRoot = join(process.cwd(), 'drizzle')
const migrationSql = readdirSync(migrationRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => readFileSync(join(migrationRoot, entry.name, 'migration.sql'), 'utf8'))
  .join('\n')

describe('T30 generated migration', () => {
  it('creates the four approved tables with relational constraints and indexes', () => {
    const createdTables = [...migrationSql.matchAll(/CREATE TABLE "([^"]+)"/gu)].map(
      (match) => match[1],
    )

    expect(createdTables.sort()).toEqual([
      'evaluation_runs',
      'generation_runs',
      'prompt_versions',
      'template_versions',
    ])
    expect(migrationSql).toContain('FOREIGN KEY ("prompt_version_id")')
    expect(migrationSql).toContain('generation_runs_status_created_at_idx')
    expect(migrationSql).toContain('evaluation_runs_case_model_prompt_repeat_unique')
    expect(migrationSql).toContain('generation_runs_route_version_boundary')
  })

  it('does not create content, user, session, IP, or hash columns', () => {
    expect(migrationSql).not.toMatch(
      /received_message|situation_text|candidate_text|generated_text|message_hash|ip_address|user_id|session_id/iu,
    )
  })
})
