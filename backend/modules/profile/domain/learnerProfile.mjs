export const learnerLevels = ['beginner', 'basic', 'interview']

export function normalizeLearnerProfile(input = {}) {
  const displayName = normalizeRequiredText(input.displayName, 'Display name is required')
  const learningGoal = normalizeRequiredText(input.learningGoal, 'Learning goal is required')
  const preferredTracks = normalizePreferredTracks(input.preferredTracks)
  const dailyStudyMinutes = Number(input.dailyStudyMinutes)

  if (!Number.isFinite(dailyStudyMinutes) || dailyStudyMinutes < 1) {
    throw new Error('Daily study minutes must be at least 1')
  }

  if (!learnerLevels.includes(input.level)) {
    throw new Error('Unsupported learner level')
  }

  return {
    displayName,
    learningGoal,
    preferredTracks,
    dailyStudyMinutes: Math.round(dailyStudyMinutes),
    level: input.level,
  }
}

function normalizeRequiredText(value, message) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized) throw new Error(message)

  return normalized
}

function normalizePreferredTracks(value) {
  const tracks = Array.isArray(value)
    ? [...new Set(value.flatMap((track) => {
        const normalized = typeof track === 'string' ? track.trim() : ''
        return normalized ? [normalized] : []
      }))]
    : []

  if (tracks.length === 0) throw new Error('Preferred track is required')

  return tracks
}
