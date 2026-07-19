export function createInMemoryLearningProgressRepository(initialMissions = {}) {
  let missions = { ...initialMissions }

  return {
    listMissions() {
      return { ...missions }
    },
    saveMission(progress) {
      missions = { ...missions, [progress.missionId]: progress }

      return progress
    },
    deleteMission(missionId) {
      const nextMissions = { ...missions }
      delete nextMissions[missionId]
      missions = nextMissions
    },
    reset() {
      missions = {}
    },
  }
}