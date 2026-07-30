import { URL } from 'node:url'
import { askTutor } from '../modules/tutor/application/askTutor.mjs'
import { createCorsHeaders, parseJsonBody } from '../shared/http.mjs'

export const tutorAskPath = '/api/tutor/ask'

export async function handleTutorApiRequest({
  method,
  url,
  bodyText,
  config,
  knowledgeChunks = [],
  provider,
  logger = console,
}) {
  const pathname = new URL(url ?? '/', 'http://localhost').pathname

  if (pathname !== tutorAskPath) {
    return null
  }

  if (method === 'OPTIONS') {
    return { status: 204, body: null, headers: createCorsHeaders() }
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

  try {
    const { answer } = await askTutor({
      question: parsedBody.value.question,
      code: parsedBody.value.code,
      fileName: parsedBody.value.fileName,
      missionTitle: parsedBody.value.missionTitle,
      missionDetail: parsedBody.value.missionDetail,
      history: parsedBody.value.history,
      config,
      knowledgeChunks,
      provider,
    })

    return { status: 200, body: { answer }, headers: createCorsHeaders() }
  } catch (error) {
    logger.error(error instanceof Error ? error.message : error)
    const message = error instanceof Error ? error.message : ''

    if (message === 'Tutor question is required') {
      return {
        status: 400,
        body: { error: 'invalid_question', message: '질문을 입력해주세요.' },
        headers: createCorsHeaders(),
      }
    }

    const status = message.includes('GEMINI_API_KEY') ? 500 : 502

    return {
      status,
      body: {
        error: status === 500 ? 'agent_configuration_error' : 'tutor_agent_failed',
        message: '튜터 응답 생성에 실패했습니다. 서버 설정과 모델 응답을 확인해주세요.',
      },
      headers: createCorsHeaders(),
    }
  }
}
