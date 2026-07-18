import { createGeneratedCurriculumPlan } from '../domain/generatedCurriculumPlan.mjs'
import { runCurriculumPlannerAgent } from '../adapters/geminiCurriculumRecommendationProvider.mjs'

export async function recommendCurriculum({
  goal,
  tracks,
  config,
  recommendationProvider = runCurriculumPlannerAgent,
}) {
  const trimmedGoal = typeof goal === 'string' ? goal.trim() : ''
  if (!trimmedGoal) {
    throw new Error('Curriculum goal is required')
  }

  const recommendation = await recommendationProvider({ goal: trimmedGoal, tracks, config })

  return createGeneratedCurriculumPlan({ goal: trimmedGoal, recommendation, tracks })
}