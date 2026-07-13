export class RepositoryError extends Error {
  constructor({ code = 'INTERNAL_ERROR', message = '잠시 후 다시 시도해주세요.', status = 500 }) {
    super(message)
    this.name = 'RepositoryError'
    this.code = code
    this.status = status
  }
}

export class HttpSaisaiRepository {
  constructor({
    baseUrl = import.meta.env.VITE_API_BASE_URL,
    getAccessToken = async () => null,
  } = {}) {
    this.baseUrl = baseUrl?.replace(/\/$/, '')
    this.getAccessToken = getAccessToken

    if (!this.baseUrl) {
      throw new Error('VITE_API_BASE_URL 환경 변수를 확인해주세요.')
    }
  }

  async request(path, { method = 'GET', body, signal } = {}) {
    const accessToken = await this.getAccessToken()
    const headers = {
      Accept: 'application/json',
    }

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    }

    let response

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      })
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error
      }

      throw new RepositoryError({
        code: 'NETWORK_ERROR',
        message: '서버에 연결할 수 없어요. 다시 시도해주세요.',
        status: 0,
      })
    }

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      throw new RepositoryError({
        code: payload?.error?.code,
        message: payload?.error?.message,
        status: response.status,
      })
    }

    return payload?.data
  }

  getMe(options) {
    return this.request('/me', options)
  }

  searchAddresses(query, options) {
    const params = new URLSearchParams({ q: query })
    return this.request(`/addresses/search?${params}`, options)
  }

  completeOnboarding(input, options) {
    return this.request('/onboarding/complete', {
      ...options,
      method: 'POST',
      body: input,
    })
  }
}
