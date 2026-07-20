import { createGeneratedCurriculumPlan } from '../domain/generatedCurriculumPlan.mjs'
import { runCurriculumPlannerAgent } from '../adapters/geminiCurriculumRecommendationProvider.mjs'
import { searchKnowledgeChunks } from '../../knowledge/adapters/jsonlKnowledgeRepository.mjs'

export async function recommendCurriculum({
  goal,
  tracks,
  config,
  recommendationProvider = runCurriculumPlannerAgent,
  knowledgeChunks = [],
}) {
  const trimmedGoal = typeof goal === 'string' ? goal.trim() : ''
  if (!trimmedGoal) {
    throw new Error('Curriculum goal is required')
  }

  const knowledgeContext = searchKnowledgeChunks({ chunks: knowledgeChunks, query: trimmedGoal, limit: 5 })
  const recommendation = await recommendationProvider({ goal: trimmedGoal, tracks, config, knowledgeContext })

  return createGeneratedCurriculumPlan({ goal: trimmedGoal, recommendation, tracks })
}
