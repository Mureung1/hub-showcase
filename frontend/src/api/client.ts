import { getAccessToken } from '../auth/supabase'
import type {
  ArticleDetail,
  CreateMissionRecordRequest,
  ErrorDetail,
  ErrorResponse,
  Interest,
  MissionRecord,
  MissionRecordCalendarResponse,
  MissionRecordListItem,
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
  apiBaseUrl = '',
) {
  const normalizedApiBaseUrl = apiBaseUrl.replace(/\/+$/, '')

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await getToken()
    const response = await fetcher(`${normalizedApiBaseUrl}/api${path}`, {
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
    getArticleDetail: (articleId: string) =>
      request<ArticleDetail>(`/articles/${encodeURIComponent(articleId)}`),
    createMissionRecord: ({ articleId, missionType, userAnswer }: CreateMissionRecordRequest) =>
      request<MissionRecord>('/mission-records', {
        method: 'POST',
        body: JSON.stringify({ articleId, missionType, userAnswer }),
      }),
    getMissionRecords: (date: string) =>
      request<MissionRecordListItem[]>(`/mission-records?date=${encodeURIComponent(date)}`),
    getMissionRecordsCalendar: (month: string) =>
      request<MissionRecordCalendarResponse>(
        `/mission-records/calendar?month=${encodeURIComponent(month)}`,
      ),
  }
}

export const api = createApiClient(
  getAccessToken,
  fetch,
  import.meta.env.VITE_API_BASE_URL,
)
