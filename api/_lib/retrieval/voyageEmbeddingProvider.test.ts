import { describe, expect, it, vi } from 'vitest'
import {
  EmbeddingProviderError,
  retrievalEmbeddingDimensions,
} from './embedding.js'
import { createVoyageEmbeddingProvider } from './voyageEmbeddingProvider.js'

const validEmbedding = (firstValue = 1) => {
  const embedding = Array.from({ length: retrievalEmbeddingDimensions }, () => 0)
  embedding[0] = firstValue
  return embedding
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  })

describe('Voyage embedding adapter', () => {
  it.each(['document', 'query'] as const)(
    'sends %s input_type and validates a 1024-dimension embedding',
    async (inputType) => {
      const fetchImplementation = vi.fn<typeof fetch>(() =>
        Promise.resolve(jsonResponse({ data: [{ embedding: validEmbedding(), index: 0 }] })),
      )
      const provider = createVoyageEmbeddingProvider({
        apiKey: 'test-secret',
        fetchImplementation,
        model: 'voyage-test-model',
      })

      await expect(provider.embed({ input: '합성 입력', inputType })).resolves.toHaveLength(1024)

      const requestInit = fetchImplementation.mock.calls[0]?.[1]
      expect(requestInit?.method).toBe('POST')
      expect(JSON.parse(String(requestInit?.body))).toEqual({
        input: ['합성 입력'],
        input_type: inputType,
        model: 'voyage-test-model',
        output_dimension: 1024,
        output_dtype: 'float',
        truncation: false,
      })
    },
  )

  it('embeds multiple documents in one request and restores input order by response index', async () => {
    const fetchImplementation = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        jsonResponse({
          data: [
            { embedding: validEmbedding(2), index: 1 },
            { embedding: validEmbedding(1), index: 0 },
          ],
        }),
      ),
    )
    const provider = createVoyageEmbeddingProvider({
      apiKey: 'test-secret',
      fetchImplementation,
      model: 'voyage-test-model',
    })

    const embedMany = provider.embedMany
    if (!embedMany) throw new Error('Batch embedding support missing')
    const embeddings = await embedMany({
      inputs: ['첫 문서', '둘째 문서'],
      inputType: 'document',
    })

    expect(embeddings).toHaveLength(2)
    expect(embeddings.map((embedding) => embedding[0])).toEqual([1, 2])
    expect(fetchImplementation).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(fetchImplementation.mock.calls[0]?.[1]?.body))).toMatchObject({
      input: ['첫 문서', '둘째 문서'],
      input_type: 'document',
    })
  })

  it.each([
    [400, 'client_error'],
    [429, 'rate_limited'],
    [503, 'transient'],
  ] as const)('normalizes HTTP %s without exposing provider response or key', async (status, failure) => {
    const secret = 'super-secret-key'
    const provider = createVoyageEmbeddingProvider({
      apiKey: secret,
      fetchImplementation: () =>
        Promise.resolve(new Response(`provider body ${secret}`, { status })),
      model: 'voyage-test-model',
    })

    const result = provider.embed({ input: '합성 입력', inputType: 'query' })
    await expect(result).rejects.toMatchObject({ failure })
    await expect(result).rejects.not.toThrow(secret)
    await expect(result).rejects.not.toThrow('provider body')
  })

  it('normalizes timeout and does not include the request text in the error', async () => {
    const fetchImplementation: typeof fetch = (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('request text leaked', 'AbortError')),
          { once: true },
        )
      })
    const provider = createVoyageEmbeddingProvider({
      apiKey: 'test-secret',
      fetchImplementation,
      model: 'voyage-test-model',
      timeoutMs: 1,
    })

    const result = provider.embed({ input: '저장하면 안 되는 query text', inputType: 'query' })
    await expect(result).rejects.toMatchObject({ failure: 'timeout' })
    await expect(result).rejects.toThrow(EmbeddingProviderError)
    await expect(result).rejects.not.toThrow('query text')
  })

  it.each([
    { data: [] },
    { data: [{ embedding: [1], index: 0 }] },
    { data: [{ embedding: Array.from({ length: 1024 }, () => 0), index: 0 }] },
    { data: [{ embedding: validEmbedding(), index: 1 }] },
  ])('rejects malformed embeddings', async (body) => {
    const provider = createVoyageEmbeddingProvider({
      apiKey: 'test-secret',
      fetchImplementation: () => Promise.resolve(jsonResponse(body)),
      model: 'voyage-test-model',
    })

    await expect(
      provider.embed({ input: '합성 입력', inputType: 'document' }),
    ).rejects.toMatchObject({ failure: 'invalid_response' })
  })
})
