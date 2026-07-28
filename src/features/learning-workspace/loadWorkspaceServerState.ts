import type { GeneratedCurriculumSnapshot } from '../curriculum/model/useGeneratedCurriculumStore'
import type { LearningProgressResponse } from '../learning-progress/api/learningProgressClient'
import type { LearningMissionProgress } from '../learning-progress/model/useLearningProgressStore'

type LoadWorkspaceServerStateOptions = {
  loadProfile: () => Promise<unknown>
  loadCurriculum: () => Promise<{ generatedCurriculum: GeneratedCurriculumSnapshot | null }>
  loadProgress: () => Promise<LearningProgressResponse>
  hydrateCurriculum: (snapshot: GeneratedCurriculumSnapshot | null) => void
  hydrateProgress: (missions: Record<string, Partial<LearningMissionProgress>>) => void
}

export async function loadWorkspaceServerState(options: LoadWorkspaceServerStateOptions) {
  const [, curriculumResponse, progressResponse] = await Promise.all([
    options.loadProfile(),
    options.loadCurriculum(),
    options.loadProgress(),
  ])

  options.hydrateCurriculum(curriculumResponse.generatedCurriculum)
  options.hydrateProgress(progressResponse.missions)
}
