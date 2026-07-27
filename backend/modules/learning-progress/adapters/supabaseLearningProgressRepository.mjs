import { executeSupabaseOperation } from '../../../shared/repositoryError.mjs'

const resource = 'learning_progress'

export function createSupabaseLearningProgressRepository(client) {
  return {
    async listMissions() {
      const rows = await executeSupabaseOperation({
        resource,
        operation: 'list',
        run: () => client.from(resource).select('*').order('updated_at', { ascending: false }),
      })

      return Object.fromEntries(rows.map((row) => [row.mission_id, mapMissionProgress(row)]))
    },
    async saveMission(progress) {
      await executeSupabaseOperation({
        resource,
        operation: 'save',
        run: () => client.from(resource).upsert(mapMissionProgressRow(progress), { onConflict: 'mission_id' }),
      })

      return progress
    },
    async deleteMission(missionId) {
      await executeSupabaseOperation({
        resource,
        operation: 'delete',
        run: () => client.from(resource).delete().eq('mission_id', missionId),
      })
    },
    async reset() {
      await executeSupabaseOperation({
        resource,
        operation: 'reset',
        run: () => client.from(resource).delete().neq('mission_id', ''),
      })
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
    activityLog: Array.isArray(row.activity_log) ? row.activity_log : [],
    lastTestResult: row.last_test_result && typeof row.last_test_result === 'object' ? row.last_test_result : null,
  }
}

function mapMissionProgressRow(progress) {
  return {
    mission_id: progress.missionId,
    run_state: progress.runState,
    run_attempt_count: progress.runAttemptCount,
    active_step_offset: progress.activeStepOffset,
    completed_at: progress.completedAt,
    activity_log: progress.activityLog,
    last_test_result: progress.lastTestResult ?? null,
    updated_at: new Date().toISOString(),
  }
}
