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
  list: async (limit = 20, offset = 0, category = 'all') => {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      category,
    })
    return apiCall<{
      postings: Posting[]
      pagination: {
        total: number
        limit: number
        offset: number
        hasMore: boolean
      }
    }>(`/postings?${params}`, {
      method: 'GET',
    })
  },

  detail: async (id: string) => {
    return apiCall<Posting>(`/postings/${id}`, {
      method: 'GET',
    })
  },

  scrap: async (id: string) => {
    return apiCall<{ isScrapped: boolean }>(`/postings/${id}/scrap`, {
      method: 'POST',
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
