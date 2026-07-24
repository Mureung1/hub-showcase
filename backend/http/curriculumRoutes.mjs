import { URL } from 'node:url'
import { recommendCurriculum } from '../modules/curriculum/application/recommendCurriculum.mjs'
import { createCorsHeaders, parseJsonBody } from '../shared/http.mjs'

export const curriculumRecommendationPath = '/api/curriculum/recommend'
export const generatedCurriculumPath = '/api/curriculum/generated'
export const curriculumHistoryPath = '/api/curriculum/history'

export async function handleCurriculumApiRequest({
  method,
  url,
  bodyText,
  tracks,
  config,
  recommendationProvider,
  generatedCurriculumRepository,
  knowledgeChunks = [],
  logger = console,
}) {
  const urlObj = new URL(url ?? '/', 'http://localhost')
  const pathname = urlObj.pathname

  if (method === 'OPTIONS') {
    return { status: 204, body: null, headers: createCorsHeaders() }
  }

  if (pathname === curriculumHistoryPath) {
    if (method === 'GET') {
      const curriculums = generatedCurriculumRepository?.list() ?? []

      return { status: 200, body: { curriculums }, headers: createCorsHeaders() }
    }

    return {
      status: 405,
      body: { error: 'method_not_allowed', message: 'GET 요청만 지원합니다.' },
      headers: { ...createCorsHeaders(), Allow: 'GET, OPTIONS' },
    }
  }

  if (pathname.startsWith('/api/curriculum/generated/')) {
    const id = pathname.slice('/api/curriculum/generated/'.length).trim()

    if (method === 'DELETE' && id) {
      const deleted = generatedCurriculumRepository?.delete(id) ?? false

      return { status: 200, body: { ok: true, deleted }, headers: createCorsHeaders() }
    }
  }

  if (pathname === generatedCurriculumPath) {
    if (method === 'GET') {
      const generatedCurriculum = generatedCurriculumRepository?.getLatest() ?? null

      return { status: 200, body: { generatedCurriculum }, headers: createCorsHeaders() }
    }

    if (method === 'POST') {
      const parsedBody = parseJsonBody(bodyText)

      if (!parsedBody.ok) {
        return {
          status: 400,
          body: { error: 'invalid_json', message: '요청 JSON을 확인해주세요.' },
          headers: createCorsHeaders(),
        }
      }

      const snapshot = generatedCurriculumRepository?.save(parsedBody.value) ?? null

      return { status: 200, body: { generatedCurriculum: snapshot }, headers: createCorsHeaders() }
    }

    if (method === 'DELETE') {
      generatedCurriculumRepository?.reset()

      return { status: 200, body: { ok: true }, headers: createCorsHeaders() }
    }

    return {
      status: 405,
      body: { error: 'method_not_allowed', message: '지원하지 않는 HTTP 메서드입니다.' },
      headers: { ...createCorsHeaders(), Allow: 'GET, POST, DELETE, OPTIONS' },
    }
  }

  if (pathname !== curriculumRecommendationPath) {
    return null
  }

  if (method !== 'POST') {
    return {
      status: 405,
      body: { error: 'method_not_allowed', message: 'POST 요청만 지원합니다.' },
      headers: { ...createCorsHeaders(), Allow: 'POST, OPTIONS' },
    }
  }

  const parsedBody = parseJsonBody(bodyText)
  if (!parsedBody.ok) {
    return {
      status: 400,
      body: { error: 'invalid_json', message: '요청 JSON을 확인해주세요.' },
      headers: createCorsHeaders(),
    }
  }

  const goal = typeof parsedBody.value.goal === 'string' ? parsedBody.value.goal.trim() : ''
  if (!goal) {
    return {
      status: 400,
      body: { error: 'invalid_goal', message: '학습 목표를 입력해주세요.' },
      headers: createCorsHeaders(),
    }
  }

  const followUpInstruction = typeof parsedBody.value.followUpInstruction === 'string'
    ? parsedBody.value.followUpInstruction.trim()
    : undefined
  const previousPlan = parsedBody.value.previousPlan

  try {
    const plan = await recommendCurriculum({
      goal,
      followUpInstruction,
      previousPlan,
      tracks,
      config,
      recommendationProvider,
      knowledgeChunks,
    })

    if (generatedCurriculumRepository) {
      generatedCurriculumRepository.save({
        id: plan.id,
        goal,
        plan,
        generatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    return { status: 200, body: { plan }, headers: createCorsHeaders() }
  } catch (error) {
    logger.error(error instanceof Error ? error.message : error)
    const message = error instanceof Error ? error.message : ''
    const status = message.includes('GEMINI_API_KEY') ? 500 : 502

    return {
      status,
      body: {
        error: status === 500 ? 'agent_configuration_error' : 'curriculum_agent_failed',
        message: '커리큘럼 생성에 실패했습니다. 서버 설정과 모델 응답을 확인해주세요.',
      },
      headers: createCorsHeaders(),
    }
  }
}
