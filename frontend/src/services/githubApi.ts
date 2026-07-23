import { tokenManager } from '../utils/apiClient'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export interface GithubRepo {
  id: number
  githubId: number
  owner: string
  name: string
  fullName: string
  description: string | null
  url: string
  stars: number
  forks: number
  openIssues: number
  language: string | null
  topics: string[]
  license: string | null
  homepageUrl: string | null
  readme: string | null
  summary: string | null
  summaryBullets: string[]
  lastFetchedAt: string
}

export interface GithubApiResponse<T> {
  success: boolean
  data?: T
  count?: number
  language?: string
  query?: string
  error?: string
}

class GithubApi {
  async getTrendingRepos(limit: number = 20, language?: string): Promise<GithubRepo[]> {
    try {
      const params = new URLSearchParams()
      params.append('limit', Math.min(limit, 50).toString())
      if (language) {
        params.append('language', language)
      }

      const response = await fetch(`${API_BASE}/api/github/trending?${params}`, {
        headers: {
          'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      const result: GithubApiResponse<GithubRepo[]> = await response.json()
      return result.data || []
    } catch (error) {
      console.error('❌ GitHub API 오류:', error)
      throw error
    }
  }

  async searchRepos(query: string, limit: number = 10): Promise<GithubRepo[]> {
    try {
      if (!query || query.length < 2) {
        throw new Error('검색어는 최소 2글자 이상이어야 합니다')
      }

      const params = new URLSearchParams()
      params.append('q', query)
      params.append('limit', Math.min(limit, 50).toString())

      const response = await fetch(`${API_BASE}/api/github/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      const result: GithubApiResponse<GithubRepo[]> = await response.json()
      return result.data || []
    } catch (error) {
      console.error('❌ 검색 오류:', error)
      throw error
    }
  }

  async getReposByLanguage(language: string, limit: number = 10): Promise<GithubRepo[]> {
    try {
      const params = new URLSearchParams()
      params.append('limit', Math.min(limit, 50).toString())

      const response = await fetch(`${API_BASE}/api/github/language/${language}?${params}`, {
        headers: {
          'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      const result: GithubApiResponse<GithubRepo[]> = await response.json()
      return result.data || []
    } catch (error) {
      console.error(`❌ ${language} 저장소 조회 오류:`, error)
      throw error
    }
  }

  async getRepoById(githubId: number): Promise<GithubRepo | null> {
    try {
      const response = await fetch(`${API_BASE}/api/github/${githubId}`, {
        headers: {
          'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`API error: ${response.statusText}`)
      }

      const result: GithubApiResponse<GithubRepo> = await response.json()
      return result.data || null
    } catch (error) {
      console.error('❌ 저장소 상세 조회 오류:', error)
      throw error
    }
  }

  async getLlmStatus(): Promise<{
    provider: string
    model: string
    status: string
  } | null> {
    try {
      const response = await fetch(`${API_BASE}/api/github/llm/status`, {
        headers: {
          'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      const result: any = await response.json()
      return result.llm || null
    } catch (error) {
      console.error('❌ LLM 상태 조회 오류:', error)
      return null
    }
  }

  async collectRepos(language?: string, limit: number = 20): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/api/github/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
        },
        body: JSON.stringify({
          language,
          limit: Math.min(limit, 50),
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      return true
    } catch (error) {
      console.error('❌ 저장소 수집 오류:', error)
      throw error
    }
  }
}

export const githubApi = new GithubApi()
