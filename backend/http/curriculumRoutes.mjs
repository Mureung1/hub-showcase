import { URL } from 'node:url'
import { recommendCurriculum } from '../modules/curriculum/application/recommendCurriculum.mjs'
import { createCorsHeaders } from '../shared/http.mjs'

export const curriculumRecommendationPath = '/api/curriculum/recommend'

export async function handleCurriculumApiRequest({
  method,
  url,
  bodyText,
  tracks,
  config,
  recommendationProvider,
  logger = console,
}) {
  const pathname = new URL(url ?? '/', 'http://localhost').pathname

  if (method === 'OPTIONS') {
    return { status: 204, body: null, headers: createCorsHeaders() }
  }

  if (pathname !== curriculumRecommendationPath) {
    return {
      status: 404,
      body: { error: 'not_found', message: '지원하지 않는 API 경로입니다.' },
      headers: createCorsHeaders(),
    }
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

  try {
    const plan = await recommendCurriculum({ goal, tracks, config, recommendationProvider })

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

function parseJsonBody(bodyText) {
  try {
    return { ok: true, value: JSON.parse(bodyText || '{}') }
  } catch {
    return { ok: false, value: null }
  }
}