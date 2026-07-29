const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

export async function getJson<T>(path: string): Promise<T> {
  return requestJson<T>(path, {
    method: 'GET',
  })
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function putJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function patchJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteJson<T>(path: string): Promise<T> {
  return requestJson<T>(path, {
    method: 'DELETE',
  })
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })

  if (!response.ok) {
    const message = await getErrorMessage(response)

    throw new ApiError(response.status, message || `Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

async function getErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as {
      error?: {
        message?: string
      }
    }

    return body.error?.message
  } catch {
    return null
  }
}
