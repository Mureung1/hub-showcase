import { parseInteractionEvent, type InteractionEvent } from '../../../src/shared/interaction/contracts'
import type { RateLimiter } from '../generation/rateLimiter'

export type InteractionEventSink = {
  record: (event: InteractionEvent) => void
}

type InteractionHandlerDependencies = {
  eventSink: InteractionEventSink
  rateLimiter: RateLimiter
}

const jsonResponse = (body: object, status: number) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
    status,
  })

const isJsonRequest = (request: Request) =>
  request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() === 'application/json'

export const getEphemeralInteractionClientKey = (request: Request) => {
  const forwardedFor =
    request.headers.get('x-vercel-forwarded-for') ??
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-real-ip')
  const firstAddress = forwardedFor?.split(',', 1)[0]?.trim()
  return firstAddress || 'unknown-client'
}

export const createInteractionHandler = ({
  eventSink,
  rateLimiter,
}: InteractionHandlerDependencies) => {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST' || !isJsonRequest(request)) {
      return jsonResponse({ error: 'invalid_request' }, 400)
    }

    let requestBody: unknown
    try {
      requestBody = await request.json()
    } catch {
      return jsonResponse({ error: 'invalid_request' }, 400)
    }

    const event = parseInteractionEvent(requestBody)
    if (!event) return jsonResponse({ error: 'invalid_request' }, 400)

    if (!rateLimiter.consume(getEphemeralInteractionClientKey(request))) {
      return jsonResponse({ error: 'rate_limited' }, 429)
    }

    try {
      eventSink.record(event)
    } catch {
      // Interaction metrics are best-effort and never block the product flow.
    }

    return new Response(null, { status: 202 })
  }
}
