import { normalizeMissionProgressInput } from '../domain/missionProgress.mjs'

export async function getTodayProgress({ repository }) {
  return { missions: await repository.listMissions() }
}

export async function saveMissionProgress({ missionId, input, repository }) {
  const normalizedMissionId = typeof missionId === 'string' ? missionId.trim() : ''
  if (!normalizedMissionId) {
    throw new Error('Mission id is required')
  }

  return await repository.saveMission(normalizeMissionProgressInput(normalizedMissionId, input))
}

export async function resetMissionProgress({ missionId, repository }) {
  const normalizedMissionId = typeof missionId === 'string' ? missionId.trim() : ''
  if (!normalizedMissionId) {
    throw new Error('Mission id is required')
  }

  await repository.deleteMission(normalizedMissionId)
}

export async function resetAllLearningProgress({ repository }) {
  await repository.reset()
}
