import {
  isServerGenerationRequest,
  isValidGenerationResponse,
  type GenerationErrorCode,
  type GenerationRequest,
  type GenerationResult,
} from './contracts.js'

export type GenerationExecutor = (request: GenerationRequest) => Promise<GenerationResult>

export type GenerationFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

const generationErrorCodes: readonly GenerationErrorCode[] = [
  'invalid_request',
  'rate_limited',
  'generation_failed',
  'timeout',
  'invalid_response',
  'unsafe_response',
]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isGenerationErrorCode = (value: unknown): value is GenerationErrorCode =>
  typeof value === 'string' &&
  generationErrorCodes.includes(value as GenerationErrorCode)

const fallbackErrorForStatus = (status: number): GenerationErrorCode => {
  if (status === 400) return 'invalid_request'
  if (status === 429) return 'rate_limited'
  return 'generation_failed'
}

const errorFromResponse = async (response: Response): Promise<GenerationErrorCode> => {
  try {
    const payload: unknown = await response.json()
    if (isRecord(payload) && isGenerationErrorCode(payload.error)) return payload.error
  } catch {
    // Fall through to the public status mapping when the error body is not JSON.
  }

  return fallbackErrorForStatus(response.status)
}

export const generateWithApi = async (
  request: GenerationRequest,
  fetcher: GenerationFetch = globalThis.fetch,
): Promise<GenerationResult> => {
  if (!isServerGenerationRequest(request)) return { ok: false, error: 'invalid_request' }

  let response: Response
  try {
    response = await fetcher('/api/generate', {
      body: JSON.stringify(request),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    })
  } catch {
    return { ok: false, error: 'generation_failed' }
  }

  if (!response.ok) return { ok: false, error: await errorFromResponse(response) }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return { ok: false, error: 'invalid_response' }
  }

  if (!isValidGenerationResponse(payload) || payload.source !== 'ai') {
    return { ok: false, error: 'invalid_response' }
  }

  return { ok: true, response: payload }
}
