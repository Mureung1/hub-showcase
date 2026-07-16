import {
  isPurposeId,
  isScenarioId,
  isSpeechStyleAllowed,
  isSpeechStyleId,
  isSituationId,
  isToneLevel,
  toneLabels,
  type Candidate,
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

export type GenerationRequest = {
  scenarioId: ScenarioId
  situationId?: SituationId
  purpose?: PurposeId
  speechStyleId?: SpeechStyleId
  receivedMessage?: string
  situation?: string
}

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

export const isValidGenerationRequest = (value: unknown): value is GenerationRequest => {
  if (!isRecord(value) || !isScenarioId(value.scenarioId)) return false

  const hasSituationCard = value.situationId !== undefined
  const receivedMessage = typeof value.receivedMessage === 'string' ? value.receivedMessage.trim() : ''
  const situation = typeof value.situation === 'string' ? value.situation.trim() : ''
  if ((value.receivedMessage !== undefined && typeof value.receivedMessage !== 'string') || (value.situation !== undefined && typeof value.situation !== 'string')) {
    return false
  }
  const hasValidReceivedMessage = receivedMessage.length <= receivedMessageMaxLength
  const hasValidSituation = situation.length <= situationMaxLength

  if (!hasValidReceivedMessage || !hasValidSituation) return false

  if (hasSituationCard) {
    return (
      isSituationId(value.situationId) &&
      value.purpose === undefined &&
      isSpeechStyleId(value.speechStyleId) &&
      !receivedMessage &&
      !situation
    )
  }

  return (
    isPurposeId(value.purpose) &&
    isSpeechStyleId(value.speechStyleId) &&
    isSpeechStyleAllowed(value.scenarioId, value.speechStyleId) &&
    (receivedMessage.length > 0 || situation.length > 0)
  )
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
