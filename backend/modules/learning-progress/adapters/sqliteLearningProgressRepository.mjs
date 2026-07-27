export function createSqliteLearningProgressRepository(database) {
  const listStatement = database.prepare('SELECT * FROM learning_progress ORDER BY updated_at DESC')
  const saveStatement = database.prepare(`
    INSERT INTO learning_progress (
      mission_id,
      run_state,
      run_attempt_count,
      active_step_offset,
      completed_at,
      activity_log_json,
      last_test_result_json,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(mission_id) DO UPDATE SET
      run_state = excluded.run_state,
      run_attempt_count = excluded.run_attempt_count,
      active_step_offset = excluded.active_step_offset,
      completed_at = excluded.completed_at,
      activity_log_json = excluded.activity_log_json,
      last_test_result_json = excluded.last_test_result_json,
      updated_at = excluded.updated_at
  `)
  const deleteStatement = database.prepare('DELETE FROM learning_progress WHERE mission_id = ?')
  const resetStatement = database.prepare('DELETE FROM learning_progress')

  return {
    listMissions() {
      return Object.fromEntries(listStatement.all().map((row) => [row.mission_id, mapMissionProgress(row)]))
    },
    saveMission(progress) {
      saveStatement.run(
        progress.missionId,
        progress.runState,
        progress.runAttemptCount,
        progress.activeStepOffset,
        progress.completedAt,
        JSON.stringify(progress.activityLog),
        progress.lastTestResult ? JSON.stringify(progress.lastTestResult) : null,
        new Date().toISOString(),
      )

      return progress
    },
    deleteMission(missionId) {
      deleteStatement.run(missionId)
    },
    reset() {
      resetStatement.run()
    },
  }
}

function mapMissionProgress(row) {
  return {
    missionId: row.mission_id,
    runState: row.run_state,
    runAttemptCount: row.run_attempt_count,
    activeStepOffset: row.active_step_offset,
    completedAt: row.completed_at,
    activityLog: parseJsonArray(row.activity_log_json),
    lastTestResult: parseJsonObject(row.last_test_result_json),
  }
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value)

    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function parseJsonObject(value) {
  if (!value) return null

  try {
    const parsed = JSON.parse(value)

    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}
