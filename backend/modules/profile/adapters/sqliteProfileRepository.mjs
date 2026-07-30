const profileId = 'primary'

export function createSqliteProfileRepository(database) {
  const getStatement = database.prepare('SELECT * FROM learner_profiles WHERE id = ?')
  const saveStatement = database.prepare(`
    INSERT INTO learner_profiles (
      id,
      display_name,
      learning_goal,
      preferred_tracks_json,
      daily_study_minutes,
      level,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      display_name = excluded.display_name,
      learning_goal = excluded.learning_goal,
      preferred_tracks_json = excluded.preferred_tracks_json,
      daily_study_minutes = excluded.daily_study_minutes,
      level = excluded.level,
      updated_at = excluded.updated_at
  `)
  const deleteStatement = database.prepare('DELETE FROM learner_profiles WHERE id = ?')

  return {
    async get() {
      const row = getStatement.get(profileId)
      return row ? mapProfile(row) : null
    },
    async save(profile) {
      saveStatement.run(
        profileId,
        profile.displayName,
        profile.learningGoal,
        JSON.stringify(profile.preferredTracks),
        profile.dailyStudyMinutes,
        profile.level,
        new Date().toISOString(),
      )
      return profile
    },
    async remove() {
      deleteStatement.run(profileId)
    },
  }
}

function mapProfile(row) {
  return {
    displayName: row.display_name,
    learningGoal: row.learning_goal,
    preferredTracks: parseTracks(row.preferred_tracks_json),
    dailyStudyMinutes: row.daily_study_minutes,
    level: row.level,
  }
}

function parseTracks(value) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
