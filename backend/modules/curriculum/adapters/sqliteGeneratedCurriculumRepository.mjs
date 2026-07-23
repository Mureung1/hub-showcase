export function createSqliteGeneratedCurriculumRepository(database) {
  const latestStatement = database.prepare('SELECT * FROM generated_curriculums ORDER BY updated_at DESC LIMIT 1')
  const saveStatement = database.prepare(`
    INSERT INTO generated_curriculums (id, goal, plan_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      goal = excluded.goal,
      plan_json = excluded.plan_json,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at
  `)
  const resetStatement = database.prepare('DELETE FROM generated_curriculums')

  return {
    getLatest() {
      const row = latestStatement.get()

      return row ? mapGeneratedCurriculum(row) : null
    },
    save(snapshot) {
      const now = new Date().toISOString()
      const record = {
        id: snapshot.id || snapshot.plan?.id || `${snapshot.goal}-curriculum-plan`,
        goal: snapshot.goal,
        plan: snapshot.plan,
        generatedAt: snapshot.generatedAt || snapshot.createdAt || now,
        updatedAt: snapshot.updatedAt || now,
      }

      saveStatement.run(
        record.id,
        record.goal,
        JSON.stringify(record.plan),
        record.generatedAt,
        record.updatedAt,
      )

      return record
    },
    reset() {
      resetStatement.run()
    },
  }
}

function mapGeneratedCurriculum(row) {
  return {
    id: row.id,
    goal: row.goal,
    plan: JSON.parse(row.plan_json),
    generatedAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
