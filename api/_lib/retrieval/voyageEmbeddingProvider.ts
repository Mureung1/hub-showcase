import {
  EmbeddingProviderError,
  retrievalEmbeddingDimensions,
  validateEmbedding,
  type EmbeddingProvider,
} from './embedding.js'

const voyageEmbeddingsEndpoint = 'https://api.voyageai.com/v1/embeddings'
const defaultTimeoutMs = 5_000

type VoyageEmbeddingProviderOptions = {
  readonly apiKey: string
  readonly fetchImplementation?: typeof fetch
  readonly model: string
  readonly timeoutMs?: number
}

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null

const embeddingsFromResponse = (value: unknown, expectedCount: number): number[][] => {
  if (!isRecord(value) || !Array.isArray(value.data) || value.data.length !== expectedCount) {
    throw new EmbeddingProviderError('invalid_response')
  }

  const indexedEmbeddings: Array<number[] | undefined> = Array.from({
    length: expectedCount,
  })
  for (const item of value.data) {
    if (
      !isRecord(item) ||
      !Number.isInteger(item.index) ||
      typeof item.index !== 'number' ||
      item.index < 0 ||
      item.index >= expectedCount ||
      indexedEmbeddings[item.index]
    ) {
      throw new EmbeddingProviderError('invalid_response')
    }
    indexedEmbeddings[item.index] = validateEmbedding(item.embedding)
  }

  return indexedEmbeddings.map((embedding) => {
    if (!embedding) throw new EmbeddingProviderError('invalid_response')
    return embedding
  })
}

const failureForStatus = (status: number) => {
  if (status === 429) return 'rate_limited' as const
  if (status >= 500) return 'transient' as const
  return 'client_error' as const
}

export const createVoyageEmbeddingProvider = (
  options: VoyageEmbeddingProviderOptions,
): EmbeddingProvider => {
  const apiKey = options.apiKey.trim()
  const model = options.model.trim()
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs
  const fetchImplementation = options.fetchImplementation ?? fetch

  if (!apiKey || !model) throw new EmbeddingProviderError('unconfigured')
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new EmbeddingProviderError('client_error')
  }

  const requestEmbeddings = async (
    inputs: readonly string[],
    inputType: 'document' | 'query',
    signal?: AbortSignal,
  ) => {
    const normalizedInputs = inputs.map((input) => input.trim())
    if (
      normalizedInputs.length === 0 ||
      normalizedInputs.length > 1_000 ||
      normalizedInputs.some((input) => !input)
    ) {
      throw new EmbeddingProviderError('client_error')
    }
    if (signal?.aborted) throw new EmbeddingProviderError('aborted')

    const controller = new AbortController()
    let timedOut = false
    const abortFromCaller = () => controller.abort()
    signal?.addEventListener('abort', abortFromCaller, { once: true })
    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)

    try {
      const response = await fetchImplementation(voyageEmbeddingsEndpoint, {
        body: JSON.stringify({
          input: normalizedInputs,
          input_type: inputType,
          model,
          output_dimension: retrievalEmbeddingDimensions,
          output_dtype: 'float',
          truncation: false,
        }),
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        method: 'POST',
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new EmbeddingProviderError(failureForStatus(response.status))
      }

      let body: unknown
      try {
        body = await response.json()
      } catch {
        throw new EmbeddingProviderError('invalid_response')
      }
      return embeddingsFromResponse(body, normalizedInputs.length)
    } catch (error) {
      if (error instanceof EmbeddingProviderError) throw error
      if (timedOut) throw new EmbeddingProviderError('timeout')
      if (signal?.aborted) throw new EmbeddingProviderError('aborted')
      throw new EmbeddingProviderError('transient')
    } finally {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', abortFromCaller)
    }
  }

  return {
    dimensions: retrievalEmbeddingDimensions,
    model,
    async embed(request) {
      const [embedding] = await requestEmbeddings(
        [request.input],
        request.inputType,
        request.signal,
      )
      if (!embedding) throw new EmbeddingProviderError('invalid_response')
      return embedding
    },
    embedMany(request) {
      return requestEmbeddings(request.inputs, request.inputType, request.signal)
    },
  }
}
