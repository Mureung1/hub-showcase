import type { GenerationRequest } from '../../../src/shared/generation/contracts'

export type AiGenerationRequest = GenerationRequest & {
  purpose: NonNullable<GenerationRequest['purpose']>
  situationId?: never
}

export type GenerationProviderOptions = {
  maxOutputTokens: number
  signal: AbortSignal
}

export type GenerationProvider = {
  generate: (request: AiGenerationRequest, options: GenerationProviderOptions) => Promise<unknown>
}

export type GenerationProviderFailure = 'client_error' | 'rate_limited' | 'transient' | 'unconfigured'

export class GenerationProviderError extends Error {
  readonly failure: GenerationProviderFailure

  constructor(failure: GenerationProviderFailure) {
    super('Generation provider failed')
    this.name = 'GenerationProviderError'
    this.failure = failure
  }
}

export const createUnconfiguredGenerationProvider = (): GenerationProvider => ({
  generate: () => Promise.reject(new GenerationProviderError('unconfigured')),
})
