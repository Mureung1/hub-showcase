const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api'

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

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || `API Error: ${response.status}`)
  }

  return response.json()
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

// 헬스 체크
export const healthCheck = async () => {
  try {
    const response = await fetch(`${API_BASE.replace('/api', '')}/health`)
    return response.ok
  } catch {
    return false
  }
}
