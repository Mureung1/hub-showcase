import { inferTrackTopics } from '../../curriculum/domain/trackTopicKeywords.mjs'
import { searchKnowledgeChunks } from '../../knowledge/adapters/jsonlKnowledgeRepository.mjs'
import { runTutorAgent } from '../adapters/geminiTutorProvider.mjs'
import { normalizeTutorRequest } from '../domain/tutorConversation.mjs'

export async function askTutor({
  question,
  code,
  fileName,
  missionTitle,
  missionDetail,
  history,
  config,
  knowledgeChunks = [],
  provider = runTutorAgent,
}) {
  const request = normalizeTutorRequest({ question, code, fileName, missionTitle, missionDetail, history })
  const searchQuery = `${request.missionTitle} ${request.question}`.trim()
  const preferredTopics = inferTrackTopics(searchQuery)
  const knowledgeContext = searchKnowledgeChunks({
    chunks: knowledgeChunks,
    query: searchQuery,
    limit: 3,
    preferredTopics,
  })

  const answer = await provider({ ...request, knowledgeContext, config })

  return { answer }
}
