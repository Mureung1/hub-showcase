export interface ApiResponse<T> {
  data: T
  meta: {
    provider?: string
    providers?: string[]
    updatedAt: string
    cached: boolean
    isDelayed?: boolean
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly provider?: string,
  ) {
    super(message)
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export async function requestApi<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(path, API_BASE_URL)

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === '') continue
    url.searchParams.set(key, String(value))
  }

  const response = await fetch(url)

  if (!response.ok) {
    const body = await readErrorBody(response)
    throw new ApiError(body.message, response.status, body.code, body.provider)
  }

  return (await response.json()) as T
}

async function readErrorBody(response: Response): Promise<{ message: string; code?: string; provider?: string }> {
  try {
    const body = (await response.json()) as {
      message?: string
      code?: string
      provider?: string
      error?: { message?: string; code?: string; provider?: string }
    }

    return {
      message: body.message ?? body.error?.message ?? 'API request failed.',
      code: body.code ?? body.error?.code,
      provider: body.provider ?? body.error?.provider,
    }
  } catch {
    return { message: 'API request failed.' }
  }
}
