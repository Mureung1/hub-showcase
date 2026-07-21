import { describe, expect, it, vi } from 'vitest'
import {
  createEnvironmentGenerationProvider,
  createGeminiGenerationProvider,
} from './geminiProvider'
import { GenerationProviderError, type AiGenerationRequest } from './provider'

const manualRequest: AiGenerationRequest = {
  mode: 'initiate',
  route: 'manual_ai',
  scenarioId: 'professor',
  purpose: 'ask',
  speechStyleId: 'seumnida',
  situation: '면담 가능한 시간을 여쭤보고 싶어요.',
}

const validReply = {
  candidates: [
    { toneLevel: 1, text: '기본 테스트 문장입니다.' },
    { toneLevel: 2, text: '더 부드러운 테스트 문장입니다.' },
    { toneLevel: 3, text: '더 분명한 테스트 문장입니다.' },
  ],
}

const geminiResponse = (finishReason: string, text: string, status = 200) =>
  new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text }] }, finishReason }],
    }),
    { headers: { 'content-type': 'application/json' }, status },
  )

const runOptions = () => ({ maxOutputTokens: 1024, signal: new AbortController().signal })

describe('Gemini generation provider', () => {
  it('sends generateContent request and normalizes a STOP completion', async () => {
    const fetchImplementation = vi.fn<typeof fetch>(() =>
      Promise.resolve(geminiResponse('STOP', JSON.stringify(validReply))),
    )
    const provider = createGeminiGenerationProvider({
      apiKey: 'test-secret',
      fetchImplementation,
      model: 'gemini-test-model',
    })

    const result = await provider.generate(manualRequest, runOptions())
    expect(result).toMatchObject({
      candidates: [
        { toneLevel: 1 },
        { toneLevel: 2 },
        { toneLevel: 3 },
      ],
    })

    const [url, requestInit] = fetchImplementation.mock.calls[0] ?? []
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-test-model:generateContent',
    )
    expect(requestInit?.headers).toMatchObject({ 'x-goog-api-key': 'test-secret' })
    const body = JSON.parse(String(requestInit?.body))
    expect(body.generationConfig.responseMimeType).toBe('application/json')
    expect(body.generationConfig.maxOutputTokens).toBe(1024)
    expect(body.contents).toHaveLength(1)
  })

  it('sanitizes the response schema for Gemini (no additionalProperties, no non-string enum)', async () => {
    const fetchImplementation = vi.fn<typeof fetch>(() =>
      Promise.resolve(geminiResponse('STOP', JSON.stringify(validReply))),
    )
    const provider = createGeminiGenerationProvider({
      apiKey: 'test-secret',
      fetchImplementation,
      model: 'gemini-test-model',
    })

    await provider.generate(manualRequest, runOptions())

    const requestInit = fetchImplementation.mock.calls[0]?.[1]
    const schema = JSON.parse(String(requestInit?.body)).generationConfig.responseSchema
    const serialized = JSON.stringify(schema)
    expect(serialized).not.toContain('additionalProperties')
    expect(schema.properties.candidates.items.properties.toneLevel.enum).toBeUndefined()
    expect(schema.properties.candidates.items.properties.toneLevel.type).toBe('integer')
  })

  it.each(['MAX_TOKENS', 'SAFETY', 'RECITATION'])(
    'treats a non-STOP finishReason (%s) as an invalid completion, not a thrown error',
    async (finishReason) => {
      const provider = createGeminiGenerationProvider({
        apiKey: 'test-secret',
        fetchImplementation: () =>
          Promise.resolve(geminiResponse(finishReason, JSON.stringify(validReply))),
        model: 'gemini-test-model',
      })

      await expect(provider.generate(manualRequest, runOptions())).resolves.toBeNull()
    },
  )

  it.each([
    [400, 'client_error'],
    [429, 'rate_limited'],
    [503, 'transient'],
  ] as const)('normalizes HTTP %s without exposing the API key', async (status, failure) => {
    const secret = 'super-secret-key'
    const provider = createGeminiGenerationProvider({
      apiKey: secret,
      fetchImplementation: () => Promise.resolve(new Response(`provider body ${secret}`, { status })),
      model: 'gemini-test-model',
    })

    const result = provider.generate(manualRequest, runOptions())
    await expect(result).rejects.toMatchObject({ failure })
    await expect(result).rejects.not.toThrow(secret)
  })

  it('normalizes fetch/abort failures to a transient error', async () => {
    const provider = createGeminiGenerationProvider({
      apiKey: 'test-secret',
      fetchImplementation: () => Promise.reject(new DOMException('aborted', 'AbortError')),
      model: 'gemini-test-model',
    })

    await expect(provider.generate(manualRequest, runOptions())).rejects.toMatchObject({
      failure: 'transient',
    })
  })

  it('resolves null when the response has no readable text', async () => {
    const provider = createGeminiGenerationProvider({
      apiKey: 'test-secret',
      fetchImplementation: () =>
        Promise.resolve(
          new Response(JSON.stringify({ candidates: [] }), {
            headers: { 'content-type': 'application/json' },
            status: 200,
          }),
        ),
      model: 'gemini-test-model',
    })

    await expect(provider.generate(manualRequest, runOptions())).resolves.toBeNull()
  })

  it('throws unconfigured when constructed without an API key or model', () => {
    expect(() =>
      createGeminiGenerationProvider({ apiKey: '', model: 'gemini-test-model' }),
    ).toThrow(GenerationProviderError)
    expect(() => createGeminiGenerationProvider({ apiKey: 'key', model: '' })).toThrow(
      GenerationProviderError,
    )
  })
})

describe('createEnvironmentGenerationProvider', () => {
  it('falls back to unconfigured when GEMINI_API_KEY is missing', async () => {
    const provider = createEnvironmentGenerationProvider({})
    await expect(provider.generate(manualRequest, runOptions())).rejects.toMatchObject({
      failure: 'unconfigured',
    })
  })

  it('builds a configured provider with the default model when GEMINI_MODEL is unset', async () => {
    const provider = createEnvironmentGenerationProvider({ GEMINI_API_KEY: 'test-secret' })
    expect(provider.generate).toBeInstanceOf(Function)
  })
})
