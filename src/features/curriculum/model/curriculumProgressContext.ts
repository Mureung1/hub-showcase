import type { LearningMissionProgress } from '../../learning-progress/model/useLearningProgressStore'
import { createGeneratedMissionId } from '../../learning-workspace/workspaceInteraction'
import type { GeneratedCurriculumPlan } from './curriculumGenerator'

export type CurriculumProgressContext = {
  missionId: string
  activeStepOffset: number
  completedStepIds: string[]
  completedAt: string | null
  lastTestResult: LearningMissionProgress['lastTestResult']
}

export function createCurriculumProgressContext(
  plan: GeneratedCurriculumPlan,
  progress?: LearningMissionProgress,
): CurriculumProgressContext {
  const activeStepOffset = Math.min(
    Math.max(progress?.activeStepOffset ?? 0, 0),
    plan.steps.length,
  )

  return {
    missionId: createGeneratedMissionId(plan.id),
    activeStepOffset,
    completedStepIds: plan.steps.slice(0, activeStepOffset).map((step) => step.id),
    completedAt: progress?.completedAt ?? null,
    lastTestResult: progress?.lastTestResult ?? null,
  }
}
