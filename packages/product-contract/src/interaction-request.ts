import {
  hasValidJsonEnvelope,
  invalidContract,
  isExactObject,
  isNonEmptyString,
  isProductQuestionId,
  isRecord,
  utf8Bytes,
} from './contract-values.js'

export type ProductInteractionAnswerRequest = {
  readonly answers: Readonly<Record<string, readonly string[]>>
}

export type ProductError = {
  readonly code: string
  readonly displayMessage: string
}

export function decodeEmptyProductRequest(
  value: unknown,
): Record<string, never> {
  if (!isExactObject(value, []) || !hasValidJsonEnvelope(value)) {
    throw invalidContract()
  }
  return {}
}

export function decodeProductInteractionAnswerRequest(
  value: unknown,
): ProductInteractionAnswerRequest {
  if (
    !isExactObject(value, ['answers']) ||
    !isRecord(value.answers) ||
    !hasValidJsonEnvelope(value)
  ) {
    throw invalidContract()
  }
  const entries = Object.entries(value.answers)
  if (entries.length === 0 || entries.length > 3) throw invalidContract()
  const answers: Record<string, readonly string[]> = Object.create(null)
  for (const [questionId, selections] of entries) {
    if (
      !isProductQuestionId(questionId) ||
      !Array.isArray(selections) ||
      selections.length > 16 ||
      !selections.every(
        (selection) =>
          typeof selection === 'string' && utf8Bytes(selection) <= 64 * 1024,
      )
    ) {
      throw invalidContract()
    }
    answers[questionId] = selections
  }
  return { answers }
}

export function decodeProductError(value: unknown): ProductError {
  if (
    !isExactObject(value, ['code', 'displayMessage']) ||
    !isNonEmptyString(value.code) ||
    !isNonEmptyString(value.displayMessage)
  ) {
    throw invalidContract()
  }
  return { code: value.code, displayMessage: value.displayMessage }
}
