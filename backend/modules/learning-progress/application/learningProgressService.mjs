import { normalizeMissionProgressInput } from '../domain/missionProgress.mjs'

export function getTodayProgress({ repository }) {
  return { missions: repository.listMissions() }
}

export function saveMissionProgress({ missionId, input, repository }) {
  const normalizedMissionId = typeof missionId === 'string' ? missionId.trim() : ''
  if (!normalizedMissionId) {
    throw new Error('Mission id is required')
  }

  return repository.saveMission(normalizeMissionProgressInput(normalizedMissionId, input))
}

export function resetMissionProgress({ missionId, repository }) {
  const normalizedMissionId = typeof missionId === 'string' ? missionId.trim() : ''
  if (!normalizedMissionId) {
    throw new Error('Mission id is required')
  }

  repository.deleteMission(normalizedMissionId)
}

export function resetAllLearningProgress({ repository }) {
  repository.reset()
}