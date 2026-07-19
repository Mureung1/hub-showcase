import { URL } from 'node:url'
import {
  getTodayProgress,
  resetAllLearningProgress,
  resetMissionProgress,
  saveMissionProgress,
} from '../modules/learning-progress/application/learningProgressService.mjs'
import { createCorsHeaders, parseJsonBody } from '../shared/http.mjs'

export async function handleLearningProgressApiRequest({ method, url, bodyText, progressRepository }) {
  const pathname = new URL(url ?? '/', 'http://localhost').pathname

  if (method === 'OPTIONS' && pathname.startsWith('/api/progress')) {
    return { status: 204, body: null, headers: createCorsHeaders() }
  }

  if (pathname === '/api/progress/today') {
    if (method !== 'GET') return methodNotAllowed('GET, OPTIONS')

    return { status: 200, body: getTodayProgress({ repository: progressRepository }), headers: createCorsHeaders() }
  }

  if (pathname === '/api/progress') {
    if (method !== 'DELETE') return methodNotAllowed('DELETE, OPTIONS')

    resetAllLearningProgress({ repository: progressRepository })

    return { status: 200, body: { missions: {} }, headers: createCorsHeaders() }
  }

  const missionMatch = /^\/api\/progress\/missions\/([^/]+)$/.exec(pathname)
  if (!missionMatch) return null

  const missionId = decodeURIComponent(missionMatch[1])

  if (method === 'POST') {
    const parsedBody = parseJsonBody(bodyText)
    if (!parsedBody.ok) {
      return {
        status: 400,
        body: { error: 'invalid_json', message: '요청 JSON을 확인해주세요.' },
        headers: createCorsHeaders(),
      }
    }

    try {
      const progress = saveMissionProgress({ missionId, input: parsedBody.value, repository: progressRepository })

      return { status: 200, body: { progress }, headers: createCorsHeaders() }
    } catch {
      return {
        status: 400,
        body: { error: 'invalid_mission_progress', message: '학습 진행 정보를 확인해주세요.' },
        headers: createCorsHeaders(),
      }
    }
  }

  if (method === 'DELETE') {
    try {
      resetMissionProgress({ missionId, repository: progressRepository })

      return { status: 200, body: { missionId }, headers: createCorsHeaders() }
    } catch {
      return {
        status: 400,
        body: { error: 'invalid_mission_id', message: '미션 ID를 확인해주세요.' },
        headers: createCorsHeaders(),
      }
    }
  }

  return methodNotAllowed('POST, DELETE, OPTIONS')
}

function methodNotAllowed(allow) {
  return {
    status: 405,
    body: { error: 'method_not_allowed', message: '지원하지 않는 요청 방식입니다.' },
    headers: { ...createCorsHeaders(), Allow: allow },
  }
}