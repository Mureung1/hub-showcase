import {
  createGenerationResponse,
  parseGenerationRequest,
  type GenerationErrorCode,
  type ServerGenerationRequest,
} from '../../../src/shared/generation/contracts.js'
import { resolveGuidedContext } from '../../../src/entities/message/guidedContext.js'
import {
  recordGenerationMetric,
  type GenerationMetricsSink,
  type GenerationMetricStatus,
} from './metrics.js'
import {
  GenerationProviderError,
  type AiGenerationRequest,
  type GenerationProvider,
} from './provider.js'
import type { RateLimiter } from './rateLimiter.js'

const defaultDeadlineMs = 18_000
const defaultMaxOutputTokens = 1_024

type GenerateHandlerDependencies = {
  deadlineMs?: number
  maxOutputTokens?: number
  metricsSink: GenerationMetricsSink
  now?: () => number
  provider: GenerationProvider
  rateLimiter: RateLimiter
}

type PublicGenerationError = Extract<GenerationErrorCode, 'generation_failed' | 'invalid_request' | 'rate_limited'>

class GenerationDeadlineError extends Error {
  constructor() {
    super('Generation deadline exceeded')
    this.name = 'GenerationDeadlineError'
  }
}

const jsonResponse = (body: object, status: number) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
    status,
  })

const errorResponse = (error: PublicGenerationError) => {
  const status = error === 'invalid_request' ? 400 : error === 'rate_limited' ? 429 : 500
  return jsonResponse({ error }, status)
}

const isJsonRequest = (request: Request) =>
  request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() === 'application/json'

const toAiGenerationRequest = (
  request: ServerGenerationRequest,
): AiGenerationRequest | null => {
  if (request.route === 'manual_ai') return request

  const guidedContext = resolveGuidedContext(
    request.scenarioId,
    request.situationId,
    request.contextAnswers,
  )
  if (!guidedContext) return null

  return {
    guidedContext,
    mode: request.mode,
    purpose: guidedContext.purposeId,
    route: 'guided_ai',
    scenarioId: request.scenarioId,
    situationId: request.situationId,
    speechStyleId: request.speechStyleId,
  }
}

const parseAiGenerationRequest = (value: unknown): AiGenerationRequest | null => {
  const request = parseGenerationRequest(value)
  if (!request || request.route === 'template_fallback') return null
  return toAiGenerationRequest(request)
}

export const getEphemeralClientKey = (request: Request) => {
  const forwardedFor =
    request.headers.get('x-vercel-forwarded-for') ??
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-real-ip')
  const firstAddress = forwardedFor?.split(',', 1)[0]?.trim()
  return firstAddress || 'unknown-client'
}

const callProviderWithinDeadline = <Result>(
  operation: Promise<Result>,
  signal: AbortSignal,
): Promise<Result> =>
  new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new GenerationDeadlineError())
      return
    }

    const handleAbort = () => reject(new GenerationDeadlineError())
    signal.addEventListener('abort', handleAbort, { once: true })

    operation.then(
      (value) => {
        signal.removeEventListener('abort', handleAbort)
        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', handleAbort)
        reject(error)
      },
    )
  })

const providerFailureStatus = (error: unknown): GenerationMetricStatus => {
  if (!(error instanceof GenerationProviderError)) return 'provider_error'
  if (error.failure === 'client_error') return 'provider_client_error'
  if (error.failure === 'rate_limited') return 'provider_rate_limited'
  if (error.failure === 'transient') return 'provider_transient_error'
  return 'provider_unconfigured'
}

const canRetryProviderFailure = (error: unknown) =>
  error instanceof GenerationProviderError && error.failure === 'transient'

export const createGenerateHandler = ({
  deadlineMs = defaultDeadlineMs,
  maxOutputTokens = defaultMaxOutputTokens,
  metricsSink,
  now = Date.now,
  provider,
  rateLimiter,
}: GenerateHandlerDependencies) => {
  return async (request: Request): Promise<Response> => {
    const startedAt = now()
    let generationRequest: AiGenerationRequest | undefined

    const finish = (
      response: Response,
      status: GenerationMetricStatus,
      attemptCount: number,
    ) => {
      recordGenerationMetric(metricsSink, {
        ...(generationRequest ? { aiInputKind: generationRequest.route } : {}),
        attemptCount,
        latencyMs: Math.max(0, now() - startedAt),
        route: 'ai',
        status,
        ...(generationRequest
          ? {
              ...(generationRequest.route === 'guided_ai'
                ? {
                    contextCatalogVersion: generationRequest.guidedContext.catalogVersion,
                    situationId: generationRequest.situationId,
                  }
                : {}),
              mode: generationRequest.mode,
              purposeId: generationRequest.purpose,
              scenarioId: generationRequest.scenarioId,
            }
          : {}),
      })
      return response
    }

    if (request.method !== 'POST' || !isJsonRequest(request)) {
      return finish(errorResponse('invalid_request'), 'invalid_request', 0)
    }

    let requestBody: unknown
    try {
      requestBody = await request.json()
    } catch {
      return finish(errorResponse('invalid_request'), 'invalid_request', 0)
    }

    const parsedRequest = parseAiGenerationRequest(requestBody)
    if (!parsedRequest) {
      return finish(errorResponse('invalid_request'), 'invalid_request', 0)
    }
    generationRequest = parsedRequest

    if (!rateLimiter.consume(getEphemeralClientKey(request))) {
      return finish(errorResponse('rate_limited'), 'rate_limited', 0)
    }

    const abortController = new AbortController()
    const deadline = setTimeout(() => abortController.abort(), deadlineMs)
    let attemptCount = 0

    try {
      while (attemptCount < 2) {
        attemptCount += 1

        try {
          const providerOutput = await callProviderWithinDeadline(
            provider.generate(generationRequest, {
              maxOutputTokens,
              signal: abortController.signal,
            }),
            abortController.signal,
          )
          const result = createGenerationResponse('ai', providerOutput)

          if (result.ok) {
            return finish(jsonResponse(result.response, 200), 'success', attemptCount)
          }

          if (result.error === 'unsafe_response') {
            return finish(errorResponse('generation_failed'), 'unsafe_response', attemptCount)
          }

          if (attemptCount < 2 && !abortController.signal.aborted) continue
          return finish(errorResponse('generation_failed'), 'invalid_response', attemptCount)
        } catch (error) {
          if (error instanceof GenerationDeadlineError || abortController.signal.aborted) {
            return finish(errorResponse('generation_failed'), 'deadline_exceeded', attemptCount)
          }

          if (attemptCount < 2 && canRetryProviderFailure(error)) continue
          return finish(errorResponse('generation_failed'), providerFailureStatus(error), attemptCount)
        }
      }

      return finish(errorResponse('generation_failed'), 'provider_error', attemptCount)
    } finally {
      clearTimeout(deadline)
    }
  }
}
