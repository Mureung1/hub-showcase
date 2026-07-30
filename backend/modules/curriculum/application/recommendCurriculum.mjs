import { createGeneratedCurriculumPlan } from '../domain/generatedCurriculumPlan.mjs'
import { inferTrackTopics } from '../domain/trackTopicKeywords.mjs'
import { runCurriculumPlannerAgent } from '../adapters/geminiCurriculumRecommendationProvider.mjs'
import { searchKnowledgeChunks } from '../../knowledge/adapters/jsonlKnowledgeRepository.mjs'

export async function recommendCurriculum({
  goal,
  followUpInstruction,
  previousPlan,
  progressContext,
  tracks,
  config,
  recommendationProvider = runCurriculumPlannerAgent,
  knowledgeChunks = [],
}) {
  const trimmedGoal = typeof goal === 'string' ? goal.trim() : ''
  if (!trimmedGoal) {
    throw new Error('Curriculum goal is required')
  }

  const trimmedFollowUp = typeof followUpInstruction === 'string' ? followUpInstruction.trim() : undefined
  const searchQuery = trimmedFollowUp ? `${trimmedGoal} ${trimmedFollowUp}` : trimmedGoal
  const preferredTopics = inferTrackTopics(searchQuery)
  const knowledgeContext = searchKnowledgeChunks({
    chunks: knowledgeChunks,
    query: searchQuery,
    limit: 5,
    preferredTopics,
  })
  const recommendation = await recommendationProvider({
    goal: trimmedGoal,
    followUpInstruction: trimmedFollowUp,
    previousPlan,
    progressContext,
    tracks,
    config,
    knowledgeContext,
  })

  const plan = createGeneratedCurriculumPlan({ goal: trimmedGoal, recommendation, tracks })

  return trimmedFollowUp && previousPlan?.id
    ? { ...plan, id: previousPlan.id }
    : plan
}
