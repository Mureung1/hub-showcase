import { URL } from 'node:url'
import {
  deleteProfile,
  getProfile,
  saveProfile,
} from '../modules/profile/application/profileService.mjs'
import { createCorsHeaders, parseJsonBody } from '../shared/http.mjs'
import { isRepositoryUnavailableError } from '../shared/repositoryError.mjs'

export async function handleProfileApiRequest({ method, url, bodyText, profileRepository }) {
  const pathname = new URL(url ?? '/', 'http://localhost').pathname
  if (pathname !== '/api/profile') return null

  if (method === 'OPTIONS') {
    return { status: 204, body: null, headers: createCorsHeaders() }
  }

  if (method === 'GET') {
    const profile = await getProfile({ repository: profileRepository })
    return { status: 200, body: { profile }, headers: createCorsHeaders() }
  }

  if (method === 'PUT') {
    const parsedBody = parseJsonBody(bodyText)
    if (!parsedBody.ok) return invalidProfileResponse('요청 JSON을 확인해 주세요.')

    try {
      const profile = await saveProfile({ input: parsedBody.value, repository: profileRepository })
      return { status: 200, body: { profile }, headers: createCorsHeaders() }
    } catch (error) {
      if (isRepositoryUnavailableError(error)) throw error
      return invalidProfileResponse('프로필 입력값을 확인해 주세요.')
    }
  }

  if (method === 'DELETE') {
    await deleteProfile({ repository: profileRepository })
    return { status: 200, body: { profile: null }, headers: createCorsHeaders() }
  }

  return {
    status: 405,
    body: { error: 'method_not_allowed', message: '지원하지 않는 요청 방식입니다.' },
    headers: { ...createCorsHeaders(), Allow: 'GET, PUT, DELETE, OPTIONS' },
  }
}

function invalidProfileResponse(message) {
  return {
    status: 400,
    body: { error: 'invalid_profile', message },
    headers: createCorsHeaders(),
  }
}
