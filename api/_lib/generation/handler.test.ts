import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDatabaseGenerationMetricsSink } from '../db/generationMetricsSink'
import { createGenerateHandler, getEphemeralClientKey } from './handler'
import type { GenerationMetric, GenerationMetricsSink } from './metrics'
import {
  GenerationProviderError,
  type AiGenerationRequest,
  type GenerationProvider,
  type GenerationProviderOptions,
} from './provider'
import { createInMemoryRateLimiter } from './rateLimiter'

const validRequestBody = {
  purpose: 'ask',
  scenarioId: 'professor',
  speechStyleId: 'seumnida',
  situation: '면담 시간을 여쭤보고 싶어요',
} as const

const validProviderOutput = {
  candidates: [
    { text: '면담 가능한 시간을 여쭤봐도 될까요?', toneLevel: 1 },
    { text: '혹시 괜찮으시다면 면담 가능한 시간을 여쭤봐도 될까요?', toneLevel: 2 },
    { text: '면담 가능한 시간을 알려주시면 감사하겠습니다.', toneLevel: 3 },
  ],
}

type ProviderStep =
  | { error: unknown; type: 'reject' }
  | { type: 'resolve'; value: unknown }
  | {
      run: (request: AiGenerationRequest, options: GenerationProviderOptions) => Promise<unknown>
      type: 'run'
    }

class FakeProvider implements GenerationProvider {
  callCount = 0
  readonly options: GenerationProviderOptions[] = []
  private readonly steps: ProviderStep[]

  constructor(steps: ProviderStep[]) {
    this.steps = [...steps]
  }

  generate(request: AiGenerationRequest, options: GenerationProviderOptions) {
    this.callCount += 1
    this.options.push(options)
    const step = this.steps.shift()
    if (!step) return Promise.reject(new Error('Missing fake provider step'))
    if (step.type === 'reject') return Promise.reject(step.error)
    if (step.type === 'run') return step.run(request, options)
    return Promise.resolve(step.value)
  }
}

const createRequest = (
  body: unknown = validRequestBody,
  init: { clientKey?: string; contentType?: string; method?: string } = {},
) =>
  new Request('https://example.test/api/generate', {
    body: init.method === 'GET' ? undefined : JSON.stringify(body),
    headers: {
      ...(init.contentType === '' ? {} : { 'content-type': init.contentType ?? 'application/json' }),
      ...(init.clientKey ? { 'x-vercel-forwarded-for': init.clientKey } : {}),
    },
    method: init.method ?? 'POST',
  })

const createMalformedJsonRequest = () =>
  new Request('https://example.test/api/generate', {
    body: '{',
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

const createMetricsCollector = () => {
  const metrics: GenerationMetric[] = []
  const sink: GenerationMetricsSink = {
    record(metric) {
      metrics.push(metric)
    },
  }
  return { metrics, sink }
}

const createHandler = (
  provider: GenerationProvider,
  sink: GenerationMetricsSink = { record: () => undefined },
) =>
  createGenerateHandler({
    metricsSink: sink,
    provider,
    rateLimiter: createInMemoryRateLimiter(),
  })

afterEach(() => {
  vi.useRealTimers()
})

describe('createGenerateHandler', () => {
  it('normalizes valid provider output and passes the output token limit', async () => {
    const provider = new FakeProvider([{ type: 'resolve', value: validProviderOutput }])
    const response = await createHandler(provider)(createRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      candidates: [
        { text: validProviderOutput.candidates[0].text, toneLabel: '기본', toneLevel: 1 },
        { text: validProviderOutput.candidates[1].text, toneLabel: '더 부드럽게', toneLevel: 2 },
        { text: validProviderOutput.candidates[2].text, toneLabel: '더 분명하게', toneLevel: 3 },
      ],
      source: 'ai',
    })
    expect(provider.callCount).toBe(1)
    expect(provider.options[0]?.maxOutputTokens).toBe(1_024)
    expect(provider.options[0]?.signal).toBeInstanceOf(AbortSignal)
  })

  it.each(['ida', 'yongyong'] as const)(
    'accepts professor requests using the %s speech style',
    async (speechStyleId) => {
      const provider = new FakeProvider([{ type: 'resolve', value: validProviderOutput }])
      const response = await createHandler(provider)(
        createRequest({ ...validRequestBody, speechStyleId }),
      )

      expect(response.status).toBe(200)
      expect(provider.callCount).toBe(1)
    },
  )

  it.each([
    ['non-POST request', createRequest(undefined, { method: 'GET' })],
    ['missing JSON content type', createRequest(validRequestBody, { contentType: '' })],
    ['malformed JSON', createMalformedJsonRequest()],
    [
      'template card request',
      createRequest({ scenarioId: 'friend', situationId: 'schedule', speechStyleId: 'haeyo' }),
    ],
    ['invalid shared contract', createRequest({ scenarioId: 'friend', situation: '내용' })],
    [
      'missing speech style',
      createRequest({ purpose: 'ask', scenarioId: 'professor', situation: '내용' }),
    ],
    [
      'unknown speech style',
      createRequest({
        purpose: 'ask',
        scenarioId: 'professor',
        speechStyleId: 'unknown',
        situation: '내용',
      }),
    ],
  ])('returns 400 for a %s', async (_label, request) => {
    const provider = new FakeProvider([{ type: 'resolve', value: validProviderOutput }])
    const response = await createHandler(provider)(request)

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'invalid_request' })
    expect(provider.callCount).toBe(0)
  })

  it('returns 429 on the eleventh request for an ephemeral client key', async () => {
    const provider: GenerationProvider = {
      generate: () => Promise.resolve(validProviderOutput),
    }
    const handler = createGenerateHandler({
      metricsSink: { record: () => undefined },
      provider,
      rateLimiter: createInMemoryRateLimiter(),
    })

    for (let requestCount = 0; requestCount < 10; requestCount += 1) {
      const response = await handler(createRequest(validRequestBody, { clientKey: '203.0.113.10' }))
      expect(response.status).toBe(200)
    }

    const limitedResponse = await handler(
      createRequest(validRequestBody, { clientKey: '203.0.113.10' }),
    )
    expect(limitedResponse.status).toBe(429)
    expect(await limitedResponse.json()).toEqual({ error: 'rate_limited' })
  })

  it('aborts the provider and returns 500 at the 18 second deadline', async () => {
    vi.useFakeTimers()
    let providerSignal: AbortSignal | undefined
    const provider = new FakeProvider([
      {
        run: (_request, options) => {
          providerSignal = options.signal
          return new Promise<unknown>(() => undefined)
        },
        type: 'run',
      },
    ])
    const pendingResponse = createHandler(provider)(createRequest())

    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(18_000)
    const response = await pendingResponse

    expect(providerSignal?.aborted).toBe(true)
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'generation_failed' })
    expect(provider.callCount).toBe(1)
  })

  it('retries one transient provider failure inside the shared deadline', async () => {
    const provider = new FakeProvider([
      { error: new GenerationProviderError('transient'), type: 'reject' },
      { type: 'resolve', value: validProviderOutput },
    ])
    const response = await createHandler(provider)(createRequest())

    expect(response.status).toBe(200)
    expect(provider.callCount).toBe(2)
    expect(provider.options[0]?.signal).toBe(provider.options[1]?.signal)
  })

  it('retries one structurally invalid provider result', async () => {
    const provider = new FakeProvider([
      { type: 'resolve', value: { candidates: [] } },
      { type: 'resolve', value: validProviderOutput },
    ])
    const response = await createHandler(provider)(createRequest())

    expect(response.status).toBe(200)
    expect(provider.callCount).toBe(2)
  })

  it.each([
    ['provider 4xx', { error: new GenerationProviderError('client_error'), type: 'reject' }],
    ['provider 429', { error: new GenerationProviderError('rate_limited'), type: 'reject' }],
    [
      'unsafe output',
      {
        type: 'resolve',
        value: {
          candidates: [
            { text: '죽어', toneLevel: 1 },
            { text: '두 번째', toneLevel: 2 },
            { text: '세 번째', toneLevel: 3 },
          ],
        },
      },
    ],
  ] satisfies Array<[string, ProviderStep]>)('does not retry %s', async (_label, step) => {
    const provider = new FakeProvider([step, { type: 'resolve', value: validProviderOutput }])
    const response = await createHandler(provider)(createRequest())

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'generation_failed' })
    expect(provider.callCount).toBe(1)
  })

  it('returns only the public 500 error after two invalid structures', async () => {
    const provider = new FakeProvider([
      { type: 'resolve', value: null },
      { type: 'resolve', value: { invalid: true } },
    ])
    const response = await createHandler(provider)(createRequest())

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'generation_failed' })
    expect(provider.callCount).toBe(2)
  })

  it('records metadata without request text, candidate text, or the client key', async () => {
    const receivedMessage = '저장하면 안 되는 받은 메시지'
    const candidateText = '저장하면 안 되는 생성 문구'
    const clientKey = '198.51.100.24'
    const providerOutput = {
      candidates: [
        { text: candidateText, toneLevel: 1 },
        { text: '부드러운 후보', toneLevel: 2 },
        { text: '분명한 후보', toneLevel: 3 },
      ],
    }
    const provider = new FakeProvider([{ type: 'resolve', value: providerOutput }])
    const { metrics, sink } = createMetricsCollector()
    const response = await createHandler(provider, sink)(
      createRequest(
        { purpose: 'ask', receivedMessage, scenarioId: 'friend', speechStyleId: 'haeyo' },
        { clientKey },
      ),
    )

    expect(response.status).toBe(200)
    expect(metrics).toHaveLength(1)
    expect(metrics[0]).toMatchObject({
      attemptCount: 1,
      purposeId: 'ask',
      route: 'ai',
      scenarioId: 'friend',
      status: 'success',
    })
    const serializedMetrics = JSON.stringify(metrics)
    expect(serializedMetrics).not.toContain(receivedMessage)
    expect(serializedMetrics).not.toContain(candidateText)
    expect(serializedMetrics).not.toContain(clientKey)
  })

  it('does not let a metrics failure change a successful response', async () => {
    const provider = new FakeProvider([{ type: 'resolve', value: validProviderOutput }])
    const response = await createHandler(provider, {
      record() {
        throw new Error('metrics unavailable')
      },
    })(createRequest())

    expect(response.status).toBe(200)
  })

  it('returns the same successful response when a scheduled database write rejects', async () => {
    const scheduledTasks: Array<Promise<void>> = []
    const metricsSink = createDatabaseGenerationMetricsSink({
      repository: {
        record: () => Promise.reject(new Error('database unavailable')),
      },
      schedule: (task) => scheduledTasks.push(task),
    })
    const provider = new FakeProvider([{ type: 'resolve', value: validProviderOutput }])

    const response = await createHandler(provider, metricsSink)(createRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      candidates: [
        { text: validProviderOutput.candidates[0].text, toneLabel: '기본', toneLevel: 1 },
        { text: validProviderOutput.candidates[1].text, toneLabel: '더 부드럽게', toneLevel: 2 },
        { text: validProviderOutput.candidates[2].text, toneLabel: '더 분명하게', toneLevel: 3 },
      ],
      source: 'ai',
    })
    await expect(scheduledTasks[0]).resolves.toBeUndefined()
  })
})

describe('getEphemeralClientKey', () => {
  it('uses only the first address from the Vercel forwarding header', () => {
    const request = new Request('https://example.test', {
      headers: {
        'x-forwarded-for': '198.51.100.8',
        'x-vercel-forwarded-for': '203.0.113.4, 203.0.113.5',
      },
    })

    expect(getEphemeralClientKey(request)).toBe('203.0.113.4')
  })
})
