const API_BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:3000/api'

export interface ApiResponse<T> {
  success?: boolean
  data?: T
  error?: string
  details?: any
}

interface AuthTokens {
  accessToken: string
  refreshToken: string
}

// 토큰 관리
export const tokenManager = {
  getAccessToken: () => localStorage.getItem('accessToken'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem('accessToken', access)
    localStorage.setItem('refreshToken', refresh)
  },
  clearTokens: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  },
}

// API 요청 헬퍼
async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  const accessToken = tokenManager.getAccessToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  if (options?.headers && typeof options.headers === 'object') {
    Object.assign(headers, options.headers)
  }

  try {
    console.log(`API 요청: ${options?.method || 'GET'} ${url}`)
    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = { error: `HTTP ${response.status}` }
      }
      console.error(`API 에러 (${response.status}):`, errorData)
      throw new Error(errorData.error || `API Error: ${response.status}`)
    }

    const data = await response.json()
    console.log('API 응답:', data)
    return data
  } catch (error) {
    console.error('API 호출 실패:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('네트워크 오류가 발생했습니다')
  }
}

// 인증 API
export const authApi = {
  signup: async (email: string, password: string) => {
    const response = await apiCall<ApiResponse<AuthTokens>>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (response.data) {
      tokenManager.setTokens(response.data.accessToken, response.data.refreshToken)
    }
    return response
  },

  login: async (email: string, password: string) => {
    const response = await apiCall<ApiResponse<AuthTokens>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (response.data) {
      tokenManager.setTokens(response.data.accessToken, response.data.refreshToken)
    }
    return response
  },

  logout: () => {
    tokenManager.clearTokens()
  },

  checkProfileStatus: async () => {
    return apiCall<{ hasProfile: boolean; requiresAuth: boolean }>(
      '/auth/profile-status',
      { method: 'GET' }
    )
  },
}

// 프로필 API
interface UserProfile {
  id: string
  userId: string
  major?: string
  grade?: number
  enrollmentStatus?: string
  residenceRegion?: string
  incomeBracket?: number
  age?: number
  interestTags: string[]
  createdAt: string
  updatedAt: string
}

export const profileApi = {
  create: async (data: Record<string, any>) => {
    return apiCall<UserProfile>('/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  fetch: async () => {
    return apiCall<UserProfile>('/profile', {
      method: 'GET',
    })
  },

  update: async (data: Partial<Record<string, any>>) => {
    return apiCall<UserProfile>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },
}

// 인증 API - 비밀번호 변경
export const authPasswordApi = {
  change: async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    return apiCall<{ success: boolean; message: string }>('/auth/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    })
  },
}

// 인증 API - 계정 삭제
export const authAccountApi = {
  delete: async () => {
    return apiCall<{ success: boolean; message: string }>('/auth/account', {
      method: 'DELETE',
    })
  },
}

// 공고 API
export interface Posting {
  id: string
  title: string
  category: string
  receptionStartDate: string
  receptionEndDate: string
  eventStartDate?: string
  eventEndDate?: string
  sourceUrl: string
  parseStatus: string
  isEligible: boolean
  matchScore: number
  isScraped: boolean
  smartScore?: {
    score: number
    reason: string
    isRecommended: boolean
    conflictLevel: 'high' | 'medium' | 'low' | 'none'
  }
  eligibility: {
    majors: string[]
    regions: string[]
    grades: number[]
    enrollmentStatuses: string[]
    ageMin?: number | null
    ageMax?: number | null
    incomeMax?: number | null
  }
}

export const postingsApi = {
  list: async (limit = 20, offset = 0, category = 'all', smart = false, sortBy: 'deadline' | 'matchScore' = 'deadline') => {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      category,
      sortBy,
    })
    if (smart) {
      params.append('smart', 'true')
    }
    return apiCall<ApiResponse<{
      postings: Posting[]
      pagination: {
        total: number
        limit: number
        offset: number
        hasMore: boolean
      }
    }>>(`/postings?${params}`, {
      method: 'GET',
    })
  },

  detail: async (id: string) => {
    return apiCall<ApiResponse<Posting>>(`/postings/${id}`, {
      method: 'GET',
    })
  },

  scrap: async (id: string) => {
    return apiCall<ApiResponse<{ isScrapped: boolean }>>(`/postings/${id}/scrap`, {
      method: 'POST',
    })
  },
}

// 캘린더 API
export interface CalendarStatus {
  connected: boolean
  email?: string
  connectedAt?: string
}

export const calendarApi = {
  getStatus: async () => {
    return apiCall<ApiResponse<CalendarStatus>>('/calendar/status', {
      method: 'GET',
    })
  },

  oauthCallback: async (code: string) => {
    return apiCall<ApiResponse<{ success: boolean }>>('/calendar/oauth-callback', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
  },

  sync: async (postingId: string) => {
    return apiCall<ApiResponse<{ success: boolean; eventId: string }>>('/calendar/sync', {
      method: 'POST',
      body: JSON.stringify({ postingId }),
    })
  },

  unsync: async (eventId: string) => {
    return apiCall<ApiResponse<{ success: boolean }>>(`/calendar/events/${eventId}`, {
      method: 'DELETE',
    })
  },
}

// 캘린더 이벤트 API
export interface CalendarEventData {
  id: string
  title: string
  type: 'EXAM' | 'PART_TIME' | 'POSTING' | 'OTHER'
  dtstart: string
  dtend: string
  source: 'manual' | 'scrap-sync'
  relatedPostingId?: string | null
}

export const calendarEventsApi = {
  list: async () => {
    return apiCall<ApiResponse<CalendarEventData[]>>('/calendar-events', {
      method: 'GET',
    })
  },

  create: async (event: {
    title: string
    type: 'EXAM' | 'PART_TIME' | 'POSTING' | 'OTHER'
    dtstart: string
    dtend: string
    relatedPostingId?: string
  }) => {
    return apiCall<ApiResponse<CalendarEventData>>('/calendar-events', {
      method: 'POST',
      body: JSON.stringify(event),
    })
  },

  update: async (id: string, data: Partial<{
    title: string
    type: 'EXAM' | 'PART_TIME' | 'POSTING' | 'OTHER'
    dtstart: string
    dtend: string
  }>) => {
    return apiCall<ApiResponse<CalendarEventData>>(`/calendar-events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return apiCall<ApiResponse<{ id: string }>>(`/calendar-events/${id}`, {
      method: 'DELETE',
    })
  },
}

// 스크랩 API
export const scrapsApi = {
  list: async (limit = 20, offset = 0, sortBy = 'dday') => {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      sortBy,
    })
    return apiCall<ApiResponse<{
      scraps: (Posting & { scrapId: string; dDay: number; notifyEnabled: boolean; scrappedAt: string })[]
      pagination: {
        total: number
        limit: number
        offset: number
        hasMore: boolean
      }
    }>>(`/scraps?${params}`, {
      method: 'GET',
    })
  },

  updateNotify: async (scrapId: string, notifyEnabled: boolean) => {
    return apiCall<ApiResponse<{ id: string; notifyEnabled: boolean }>>(`/scraps/${scrapId}`, {
      method: 'PATCH',
      body: JSON.stringify({ notifyEnabled }),
    })
  },
}

// 헬스 체크
export const healthCheck = async () => {
  try {
    const response = await fetch(`${API_BASE.replace('/api', '')}/health`)
    return response.ok
  } catch {
    return false
  }
}
