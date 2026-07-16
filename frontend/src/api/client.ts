import { getAccessToken } from '../lib/supabase'
import type {
  ErrorDetail,
  ErrorResponse,
  Interest,
  ReplaceUserInterestsResponse,
  TodayArticlesResponse,
  UserInterestsResponse,
} from './types'

export class ApiClientError extends Error {
  status: number
  code: string
  details?: ErrorDetail[]

  constructor(status: number, body: ErrorResponse) {
    super(body.message)
    this.status = status
    this.code = body.code
    this.details = body.details
  }
}

export function createApiClient(
  getToken: () => Promise<string>,
  fetcher: typeof fetch = fetch,
) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await getToken()
    const response = await fetcher(`/api${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
    })
    const body = await response.json()
    if (!response.ok) throw new ApiClientError(response.status, body as ErrorResponse)
    return body as T
  }

  return {
    getInterests: () => request<Interest[]>('/interests'),
    getUserInterests: () => request<UserInterestsResponse>('/user-interests'),
    replaceUserInterests: (interestIds: string[]) =>
      request<ReplaceUserInterestsResponse>('/user-interests', {
        method: 'POST',
        body: JSON.stringify({ interestIds }),
      }),
    getTodayArticles: () => request<TodayArticlesResponse>('/articles/today'),
  }
}

export const api = createApiClient(getAccessToken)
