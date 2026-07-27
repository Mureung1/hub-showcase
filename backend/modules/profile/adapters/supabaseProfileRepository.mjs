import { executeSupabaseOperation } from '../../../shared/repositoryError.mjs'

const resource = 'learner_profiles'
const profileId = 'primary'

export function createSupabaseProfileRepository(client) {
  return {
    async get() {
      const row = await executeSupabaseOperation({
        resource,
        operation: 'get',
        run: () => client.from(resource).select('*').eq('id', profileId).maybeSingle(),
      })

      return row ? mapProfile(row) : null
    },
    async save(profile) {
      await executeSupabaseOperation({
        resource,
        operation: 'save',
        run: () => client.from(resource).upsert(mapProfileRow(profile), { onConflict: 'id' }),
      })

      return profile
    },
    async remove() {
      await executeSupabaseOperation({
        resource,
        operation: 'remove',
        run: () => client.from(resource).delete().eq('id', profileId),
      })
    },
  }
}

function mapProfile(row) {
  return {
    displayName: row.display_name,
    learningGoal: row.learning_goal,
    preferredTracks: Array.isArray(row.preferred_tracks) ? row.preferred_tracks : [],
    dailyStudyMinutes: row.daily_study_minutes,
    level: row.level,
  }
}

function mapProfileRow(profile) {
  return {
    id: profileId,
    display_name: profile.displayName,
    learning_goal: profile.learningGoal,
    preferred_tracks: profile.preferredTracks,
    daily_study_minutes: profile.dailyStudyMinutes,
    level: profile.level,
  }
}
