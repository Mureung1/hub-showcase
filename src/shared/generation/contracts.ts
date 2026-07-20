import {
  isSituationForScenario,
  isPurposeId,
  isScenarioId,
  isSpeechStyleAllowed,
  isSpeechStyleId,
  isSituationId,
  isToneLevel,
  toneLabels,
  type Candidate,
  type ContextAnswer,
  type Mode,
  type PurposeId,
  type ScenarioId,
  type SpeechStyleId,
  type SituationId,
  type Source,
  type ToneLevel,
} from '../../entities/message'

export const receivedMessageMaxLength = 500
export const situationMaxLength = 300
export const candidateMaxLength = 600
export const metadataMaxLength = 180

export type GenerationRoute = 'template_fallback' | 'guided_ai' | 'manual_ai'

type GenerationRequestBase = {
  mode: Mode
  route: GenerationRoute
  scenarioId: ScenarioId
  speechStyleId: SpeechStyleId
}

export type TemplateFallbackRequest = GenerationRequestBase & {
  route: 'template_fallback'
  situationId: SituationId
  contextAnswers?: never
  purpose?: never
  receivedMessage?: never
  situation?: never
}

export type GuidedAiRequest = GenerationRequestBase & {
  route: 'guided_ai'
  situationId: SituationId
  contextAnswers: readonly [ContextAnswer]
  purpose?: never
  receivedMessage?: never
  situation?: never
}

export type ManualReplyAiRequest = GenerationRequestBase & {
  route: 'manual_ai'
  mode: 'reply'
  purpose: PurposeId
  receivedMessage: string
  situation?: string
  situationId?: never
  contextAnswers?: never
}

export type ManualInitiateAiRequest = GenerationRequestBase & {
  route: 'manual_ai'
  mode: 'initiate'
  purpose: PurposeId
  situation: string
  receivedMessage?: never
  situationId?: never
  contextAnswers?: never
}

export type ManualAiRequest = ManualReplyAiRequest | ManualInitiateAiRequest
export type ServerGenerationRequest = GuidedAiRequest | ManualAiRequest
export type GenerationRequest = TemplateFallbackRequest | ServerGenerationRequest

export type GeneratedCandidate = {
  toneLevel: ToneLevel
  text: string
}

export type GeneratedReply = {
  candidates: GeneratedCandidate[]
  situationSummary?: string
  warning?: string
}

export type GenerationResponse = {
  source: Source
  candidates: Candidate[]
  situationSummary?: string
  warning?: string
}

export type GenerationErrorCode =
  | 'invalid_request'
  | 'rate_limited'
  | 'generation_failed'
  | 'timeout'
  | 'invalid_response'
  | 'unsafe_response'

export type GenerationResult =
  | { ok: true; response: GenerationResponse }
  | { ok: false; error: GenerationErrorCode }

type RecordValue = Record<string, unknown>

const unsafeExpression = /죽어|죽인다|해치겠다|협박|가만두지 않겠다/u

const isRecord = (value: unknown): value is RecordValue => typeof value === 'object' && value !== null

const hasOnlyKeys = (value: RecordValue, keys: readonly string[]) =>
  Object.keys(value).every((key) => keys.includes(key))

const isMode = (value: unknown): value is Mode => value === 'reply' || value === 'initiate'

const parseContextAnswer = (value: unknown): ContextAnswer | null => {
  if (!isRecord(value) || !hasOnlyKeys(value, ['questionId', 'optionId'])) return null
  if (typeof value.questionId !== 'string' || typeof value.optionId !== 'string') return null
  const questionId = value.questionId.trim()
  const optionId = value.optionId.trim()
  if (!questionId || !optionId || questionId.length > 96 || optionId.length > 96) return null
  return { questionId, optionId }
}

const isOptionalMetadata = (value: unknown): value is string | undefined =>
  value === undefined || (typeof value === 'string' && value.trim().length > 0 && value.trim().length <= metadataMaxLength)

const hasValidText = (value: unknown) =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.trim().length <= candidateMaxLength &&
  !unsafeExpression.test(value)

const hasUnsafeCandidate = (value: unknown) =>
  isRecord(value) && typeof value.text === 'string' && unsafeExpression.test(value.text)

const isGeneratedCandidate = (value: unknown): value is GeneratedCandidate =>
  isRecord(value) && isToneLevel(value.toneLevel) && hasValidText(value.text)

const hasRequiredToneLevels = (candidates: GeneratedCandidate[]) => {
  const toneLevels = candidates.map((candidate) => candidate.toneLevel).sort((left, right) => left - right)
  return toneLevels[0] === 1 && toneLevels[1] === 2 && toneLevels[2] === 3
}

const hasDistinctMessages = (candidates: GeneratedCandidate[]) =>
  new Set(candidates.map((candidate) => candidate.text.trim())).size === candidates.length

export const parseGenerationRequest = (value: unknown): GenerationRequest | null => {
  if (
    !isRecord(value) ||
    !isScenarioId(value.scenarioId) ||
    !isMode(value.mode) ||
    !isSpeechStyleId(value.speechStyleId) ||
    !isSpeechStyleAllowed(value.scenarioId, value.speechStyleId)
  ) {
    return null
  }

  const base = {
    mode: value.mode,
    scenarioId: value.scenarioId,
    speechStyleId: value.speechStyleId,
  }

  if (value.route === 'template_fallback') {
    if (
      !hasOnlyKeys(value, ['route', 'mode', 'scenarioId', 'speechStyleId', 'situationId']) ||
      !isSituationId(value.situationId) ||
      !isSituationForScenario(value.scenarioId, value.situationId)
    ) {
      return null
    }
    return { ...base, route: 'template_fallback', situationId: value.situationId }
  }

  if (value.route === 'guided_ai') {
    if (
      !hasOnlyKeys(value, ['route', 'mode', 'scenarioId', 'speechStyleId', 'situationId', 'contextAnswers']) ||
      !isSituationId(value.situationId) ||
      !isSituationForScenario(value.scenarioId, value.situationId) ||
      !Array.isArray(value.contextAnswers) ||
      value.contextAnswers.length !== 1
    ) {
      return null
    }
    const answer = parseContextAnswer(value.contextAnswers[0])
    if (!answer) return null
    return { ...base, route: 'guided_ai', situationId: value.situationId, contextAnswers: [answer] }
  }

  if (value.route !== 'manual_ai' || !isPurposeId(value.purpose)) return null

  if (value.mode === 'reply') {
    if (
      !hasOnlyKeys(value, [
        'route',
        'mode',
        'scenarioId',
        'speechStyleId',
        'purpose',
        'receivedMessage',
        'situation',
      ]) ||
      typeof value.receivedMessage !== 'string' ||
      (value.situation !== undefined && typeof value.situation !== 'string')
    ) {
      return null
    }
    const receivedMessage = value.receivedMessage.trim()
    const situation = typeof value.situation === 'string' ? value.situation.trim() : ''
    if (
      !receivedMessage ||
      receivedMessage.length > receivedMessageMaxLength ||
      situation.length > situationMaxLength
    ) {
      return null
    }
    return {
      ...base,
      route: 'manual_ai',
      mode: 'reply',
      purpose: value.purpose,
      receivedMessage,
      ...(situation ? { situation } : {}),
    }
  }

  if (
    !hasOnlyKeys(value, ['route', 'mode', 'scenarioId', 'speechStyleId', 'purpose', 'situation']) ||
    typeof value.situation !== 'string'
  ) {
    return null
  }
  const situation = value.situation.trim()
  if (!situation || situation.length > situationMaxLength) return null
  return { ...base, route: 'manual_ai', mode: 'initiate', purpose: value.purpose, situation }
}

export const isValidGenerationRequest = (value: unknown): value is GenerationRequest =>
  parseGenerationRequest(value) !== null

export const isServerGenerationRequest = (value: unknown): value is ServerGenerationRequest => {
  const request = parseGenerationRequest(value)
  return request !== null && request.route !== 'template_fallback'
}

export const parseGeneratedReply = (value: unknown): GeneratedReply | null => {
  if (!isRecord(value) || !Array.isArray(value.candidates) || value.candidates.length !== 3) return null
  if (!value.candidates.every(isGeneratedCandidate)) return null
  if (!isOptionalMetadata(value.situationSummary) || !isOptionalMetadata(value.warning)) return null

  const candidates = value.candidates.map((candidate) => ({
    toneLevel: candidate.toneLevel,
    text: candidate.text.trim(),
  }))

  if (!hasRequiredToneLevels(candidates) || !hasDistinctMessages(candidates)) return null

  return {
    candidates: candidates.sort((left, right) => left.toneLevel - right.toneLevel),
    ...(typeof value.situationSummary === 'string' ? { situationSummary: value.situationSummary.trim() } : {}),
    ...(typeof value.warning === 'string' ? { warning: value.warning.trim() } : {}),
  }
}

export const createGenerationResponse = (source: Source, value: unknown): GenerationResult => {
  const generatedReply = parseGeneratedReply(value)
  if (!generatedReply) {
    const containsUnsafeCandidate =
      isRecord(value) && Array.isArray(value.candidates) && value.candidates.some(hasUnsafeCandidate)
    return { ok: false, error: containsUnsafeCandidate ? 'unsafe_response' : 'invalid_response' }
  }

  return {
    ok: true,
    response: {
      source,
      candidates: generatedReply.candidates.map((candidate) => ({
        toneLevel: candidate.toneLevel,
        toneLabel: toneLabels[candidate.toneLevel],
        text: candidate.text,
      })),
      ...(generatedReply.situationSummary ? { situationSummary: generatedReply.situationSummary } : {}),
      ...(generatedReply.warning ? { warning: generatedReply.warning } : {}),
    },
  }
}

export const isValidGenerationResponse = (value: unknown): value is GenerationResponse => {
  if (!isRecord(value) || (value.source !== 'template' && value.source !== 'ai')) return false
  if (!Array.isArray(value.candidates)) return false

  const generatedReply = parseGeneratedReply({
    candidates: value.candidates,
    ...(value.situationSummary !== undefined ? { situationSummary: value.situationSummary } : {}),
    ...(value.warning !== undefined ? { warning: value.warning } : {}),
  })
  if (!generatedReply) return false

  return value.candidates.every(
    (candidate) =>
      isRecord(candidate) &&
      isToneLevel(candidate.toneLevel) &&
      candidate.toneLabel === toneLabels[candidate.toneLevel],
  )
}
