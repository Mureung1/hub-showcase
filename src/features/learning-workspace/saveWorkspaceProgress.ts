import type {
  SaveLearningProgressRequest,
  SaveLearningProgressResponse,
} from '../learning-progress/api/learningProgressClient'
import type { LearningMissionProgress } from '../learning-progress/model/useLearningProgressStore'

type SaveWorkspaceProgressDependencies = {
  save: (
    missionId: string,
    request: SaveLearningProgressRequest,
  ) => Promise<SaveLearningProgressResponse>
  upsert: (progress: LearningMissionProgress) => void
}

export async function saveWorkspaceProgress(
  missionId: string,
  request: SaveLearningProgressRequest,
  dependencies: SaveWorkspaceProgressDependencies,
) {
  const { progress } = await dependencies.save(missionId, request)
  dependencies.upsert(progress)

  return progress
}
