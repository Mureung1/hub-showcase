import { describe, expect, it, vi } from 'vitest'
import { createDatabaseInteractionMetricsSink } from '../db/interactionMetricsSink'
import { createInMemoryRateLimiter, type RateLimiter } from '../generation/rateLimiter'
import {
  createInteractionHandler,
  getEphemeralInteractionClientKey,
  type InteractionEventSink,
} from './handler'

const validEvent = {
  eventName: 'copy_succeeded',
  mode: 'reply',
  route: 'guided_ai',
  scenarioId: 'groupwork',
  situationId: 'schedule',
  toneLevel: 2,
} as const

const createRequest = (
  body: unknown = validEvent,
  init: { clientKey?: string; contentType?: string; method?: string } = {},
) =>
  new Request('https://example.test/api/interaction', {
    body: init.method === 'GET' ? undefined : JSON.stringify(body),
    headers: {
      ...(init.contentType === '' ? {} : { 'content-type': init.contentType ?? 'application/json' }),
      ...(init.clientKey ? { 'x-vercel-forwarded-for': init.clientKey } : {}),
    },
    method: init.method ?? 'POST',
  })

const malformedJsonRequest = () =>
  new Request('https://example.test/api/interaction', {
    body: '{',
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

const createHandler = (eventSink: InteractionEventSink = { record: () => undefined }) =>
  createInteractionHandler({ eventSink, rateLimiter: createInMemoryRateLimiter() })

describe('createInteractionHandler', () => {
  it('accepts only the shared parser result and returns 202 without a response body', async () => {
    const record = vi.fn<InteractionEventSink['record']>()
    const response = await createHandler({ record })(
      createRequest(validEvent, { clientKey: '203.0.113.20' }),
    )

    expect(response.status).toBe(202)
    expect(await response.text()).toBe('')
    expect(record).toHaveBeenCalledExactlyOnceWith(validEvent)
    expect(JSON.stringify(record.mock.calls)).not.toContain('203.0.113.20')
  })

  it('accepts the professor-only email route without card situation metadata', async () => {
    const emailEvent = {
      eventName: 'copy_succeeded',
      mode: 'initiate',
      route: 'email_template',
      scenarioId: 'professor',
      toneLevel: 1,
    } as const
    const record = vi.fn<InteractionEventSink['record']>()
    const response = await createHandler({ record })(createRequest(emailEvent))

    expect(response.status).toBe(202)
    expect(record).toHaveBeenCalledExactlyOnceWith(emailEvent)
  })

  it.each([
    ['non-POST request', createRequest(undefined, { method: 'GET' })],
    ['missing JSON content type', createRequest(validEvent, { contentType: '' })],
    ['non-JSON content type', createRequest(validEvent, { contentType: 'text/plain' })],
    ['malformed JSON', malformedJsonRequest()],
    ['unknown event', createRequest({ ...validEvent, eventName: 'unknown' })],
    ['unknown key', createRequest({ ...validEvent, arbitrary: true })],
    ['content key', createRequest({ ...validEvent, editedText: '민감한 수정문' })],
    ['identifier key', createRequest({ ...validEvent, sessionId: 'persistent-session' })],
    [
      'guided event without situation',
      createRequest({
        eventName: 'result_shown',
        mode: 'reply',
        route: 'guided_ai',
        scenarioId: 'friend',
      }),
    ],
  ])('returns 400 for %s', async (_label, request) => {
    const record = vi.fn<InteractionEventSink['record']>()
    const response = await createHandler({ record })(request)

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'invalid_request' })
    expect(record).not.toHaveBeenCalled()
  })

  it('returns 429 after the per-instance in-memory allowance is exhausted', async () => {
    const record = vi.fn<InteractionEventSink['record']>()
    const handler = createHandler({ record })

    for (let requestCount = 0; requestCount < 10; requestCount += 1) {
      const response = await handler(createRequest(validEvent, { clientKey: '198.51.100.10' }))
      expect(response.status).toBe(202)
    }

    const limitedResponse = await handler(
      createRequest(validEvent, { clientKey: '198.51.100.10' }),
    )
    expect(limitedResponse.status).toBe(429)
    expect(await limitedResponse.json()).toEqual({ error: 'rate_limited' })
    expect(record).toHaveBeenCalledTimes(10)
  })

  it('keeps the client key inside the limiter and never passes it to the event sink', async () => {
    const consumedKeys: string[] = []
    const rateLimiter: RateLimiter = {
      consume(clientKey) {
        consumedKeys.push(clientKey)
        return true
      },
    }
    const record = vi.fn<InteractionEventSink['record']>()
    const handler = createInteractionHandler({ eventSink: { record }, rateLimiter })

    await handler(createRequest(validEvent, { clientKey: '192.0.2.70, 192.0.2.71' }))

    expect(consumedKeys).toEqual(['192.0.2.70'])
    expect(record).toHaveBeenCalledExactlyOnceWith(validEvent)
  })

  it('returns 202 even when the best-effort sink throws synchronously', async () => {
    const response = await createHandler({
      record: () => {
        throw new Error('metrics unavailable')
      },
    })(createRequest())

    expect(response.status).toBe(202)
  })

  it('returns 202 while a scheduled database write later fails', async () => {
    const scheduledTasks: Array<Promise<void>> = []
    const eventSink = createDatabaseInteractionMetricsSink({
      repository: { record: () => Promise.reject(new Error('database unavailable')) },
      schedule: (task) => scheduledTasks.push(task),
    })
    const response = await createHandler(eventSink)(createRequest())

    expect(response.status).toBe(202)
    expect(scheduledTasks).toHaveLength(1)
    await expect(scheduledTasks[0]).resolves.toBeUndefined()
  })
})

describe('getEphemeralInteractionClientKey', () => {
  it('uses forwarded headers only as an ephemeral in-memory limiter key', () => {
    expect(
      getEphemeralInteractionClientKey(
        createRequest(validEvent, { clientKey: '  203.0.113.8, 203.0.113.9 ' }),
      ),
    ).toBe('203.0.113.8')
    expect(getEphemeralInteractionClientKey(createRequest())).toBe('unknown-client')
  })
})
