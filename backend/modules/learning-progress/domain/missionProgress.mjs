export const learningRunStates = ['idle', 'failed', 'passed']

export function createMissionProgress(missionId, input = {}) {
  return {
    missionId,
    runState: isLearningRunState(input.runState) ? input.runState : 'idle',
    runAttemptCount: normalizeNumber(input.runAttemptCount, 0),
    activeStepOffset: normalizeNumber(input.activeStepOffset, 0),
    completedAt: typeof input.completedAt === 'string' ? input.completedAt : null,
    activityLog: normalizeActivityLog(input.activityLog),
  }
}

export function normalizeMissionProgressInput(missionId, input = {}) {
  return createMissionProgress(missionId, {
    runState: input.runState,
    runAttemptCount: input.runAttemptCount,
    activeStepOffset: input.activeStepOffset,
    completedAt: input.completedAt,
    activityLog: input.activityLog,
  })
}

export function isLearningRunState(value) {
  return learningRunStates.includes(value)
}

function normalizeNumber(value, fallback) {
  const numericValue = Number(value)

  return Number.isFinite(numericValue) && numericValue >= 0 ? Math.round(numericValue) : fallback
}

function normalizeActivityLog(value) {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []

    const id = typeof item.id === 'string' ? item.id : ''
    const time = typeof item.time === 'string' ? item.time : ''
    const title = typeof item.title === 'string' ? item.title : ''
    const detail = typeof item.detail === 'string' ? item.detail : ''

    return id && title ? [{ id, time, title, detail }] : []
  }).slice(0, 5)
}