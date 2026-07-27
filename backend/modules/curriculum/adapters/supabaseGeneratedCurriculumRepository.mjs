import { executeSupabaseOperation } from '../../../shared/repositoryError.mjs'

const resource = 'generated_curriculums'

export function createSupabaseGeneratedCurriculumRepository(client) {
  return {
    async getLatest() {
      const row = await executeSupabaseOperation({
        resource,
        operation: 'getLatest',
        run: () => client.from(resource).select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      })

      return row ? mapGeneratedCurriculum(row) : null
    },
    async list() {
      const rows = await executeSupabaseOperation({
        resource,
        operation: 'list',
        run: () => client.from(resource).select('*').order('updated_at', { ascending: false }),
      })

      return rows.map(mapGeneratedCurriculum)
    },
    async getById(id) {
      const row = await executeSupabaseOperation({
        resource,
        operation: 'getById',
        run: () => client.from(resource).select('*').eq('id', id).maybeSingle(),
      })

      return row ? mapGeneratedCurriculum(row) : null
    },
    async save(snapshot) {
      const record = normalizeGeneratedCurriculum(snapshot)
      await executeSupabaseOperation({
        resource,
        operation: 'save',
        run: () => client.from(resource).upsert(mapGeneratedCurriculumRow(record), { onConflict: 'id' }),
      })

      return record
    },
    async delete(id) {
      const rows = await executeSupabaseOperation({
        resource,
        operation: 'delete',
        run: () => client.from(resource).delete().eq('id', id).select('id'),
      })

      return rows.length > 0
    },
    async reset() {
      await executeSupabaseOperation({
        resource,
        operation: 'reset',
        run: () => client.from(resource).delete().neq('id', ''),
      })
    },
  }
}

function normalizeGeneratedCurriculum(snapshot) {
  const now = new Date().toISOString()

  return {
    id: snapshot.id || snapshot.plan?.id || `${snapshot.goal}-curriculum-plan`,
    goal: snapshot.goal,
    plan: snapshot.plan,
    generatedAt: snapshot.generatedAt || snapshot.createdAt || now,
    updatedAt: snapshot.updatedAt || now,
  }
}

function mapGeneratedCurriculum(row) {
  return {
    id: row.id,
    goal: row.goal,
    plan: row.plan,
    generatedAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapGeneratedCurriculumRow(record) {
  return {
    id: record.id,
    goal: record.goal,
    plan: record.plan,
    created_at: record.generatedAt,
    updated_at: record.updatedAt,
  }
}
