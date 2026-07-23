export const retrievalEmbeddingDimensions = 1024

export type EmbeddingInputType = 'document' | 'query'

export type EmbeddingRequest = {
  readonly input: string
  readonly inputType: EmbeddingInputType
  readonly signal?: AbortSignal
}

export type EmbeddingBatchRequest = {
  readonly inputs: readonly string[]
  readonly inputType: EmbeddingInputType
  readonly signal?: AbortSignal
}

export type EmbeddingProvider = {
  readonly dimensions: typeof retrievalEmbeddingDimensions
  readonly model: string
  embed: (request: EmbeddingRequest) => Promise<number[]>
  embedMany?: (request: EmbeddingBatchRequest) => Promise<readonly number[][]>
}

export type EmbeddingProviderFailure =
  | 'aborted'
  | 'client_error'
  | 'invalid_response'
  | 'rate_limited'
  | 'timeout'
  | 'transient'
  | 'unconfigured'

export class EmbeddingProviderError extends Error {
  readonly failure: EmbeddingProviderFailure

  constructor(failure: EmbeddingProviderFailure) {
    super('Embedding provider failed')
    this.name = 'EmbeddingProviderError'
    this.failure = failure
  }
}

export const validateEmbedding = (value: unknown): number[] => {
  if (
    !Array.isArray(value) ||
    value.length !== retrievalEmbeddingDimensions ||
    !value.every((item) => typeof item === 'number' && Number.isFinite(item))
  ) {
    throw new EmbeddingProviderError('invalid_response')
  }

  const embedding = value as number[]
  const squaredNorm = embedding.reduce((sum, item) => sum + item * item, 0)
  if (!Number.isFinite(squaredNorm) || squaredNorm === 0) {
    throw new EmbeddingProviderError('invalid_response')
  }

  return [...embedding]
}
