import {
  EmbeddingProviderError,
  retrievalEmbeddingDimensions,
  validateEmbedding,
  type EmbeddingProvider,
} from './embedding'

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

const embeddingFromResponse = (value: unknown): number[] => {
  if (!isRecord(value) || !Array.isArray(value.data) || value.data.length !== 1) {
    throw new EmbeddingProviderError('invalid_response')
  }
  const item = value.data[0]
  if (!isRecord(item)) throw new EmbeddingProviderError('invalid_response')
  return validateEmbedding(item.embedding)
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

  return {
    dimensions: retrievalEmbeddingDimensions,
    model,
    async embed(request) {
      const input = request.input.trim()
      if (!input) throw new EmbeddingProviderError('client_error')
      if (request.signal?.aborted) throw new EmbeddingProviderError('aborted')

      const controller = new AbortController()
      let timedOut = false
      const abortFromCaller = () => controller.abort()
      request.signal?.addEventListener('abort', abortFromCaller, { once: true })
      const timeout = setTimeout(() => {
        timedOut = true
        controller.abort()
      }, timeoutMs)

      try {
        const response = await fetchImplementation(voyageEmbeddingsEndpoint, {
          body: JSON.stringify({
            input: [input],
            input_type: request.inputType,
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
        return embeddingFromResponse(body)
      } catch (error) {
        if (error instanceof EmbeddingProviderError) throw error
        if (timedOut) throw new EmbeddingProviderError('timeout')
        if (request.signal?.aborted) throw new EmbeddingProviderError('aborted')
        throw new EmbeddingProviderError('transient')
      } finally {
        clearTimeout(timeout)
        request.signal?.removeEventListener('abort', abortFromCaller)
      }
    },
  }
}
