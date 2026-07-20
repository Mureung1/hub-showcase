import type {
  Mode,
  PurposeId,
  ScenarioId,
  SpeechStyleId,
  SituationId,
} from '../../../src/entities/message'
import type { ResolvedGuidedContext } from '../../../src/entities/message/guidedContext'
import type { ManualAiRequest } from '../../../src/shared/generation/contracts'

export type TrustedGuidedAiGenerationRequest = {
  readonly guidedContext: ResolvedGuidedContext
  readonly mode: Mode
  readonly purpose: PurposeId
  readonly route: 'guided_ai'
  readonly scenarioId: ScenarioId
  readonly situationId: SituationId
  readonly speechStyleId: SpeechStyleId
}

export type AiGenerationRequest = ManualAiRequest | TrustedGuidedAiGenerationRequest

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
