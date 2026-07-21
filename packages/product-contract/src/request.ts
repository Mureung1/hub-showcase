import {
  hasValidJsonEnvelope,
  invalidContract,
  isCourseId,
  isDigest,
  isExactObject,
  isMaterialId,
  isNonEmptyString,
  isProductQuestionId,
  isRecord,
  utf8Bytes,
} from './contract-values.js'

export const FIRST_ASSIGNMENT_RECIPE_VERSION = '1'
export const FIRST_ASSIGNMENT_ARGUMENTS = { timezone: 'Asia/Seoul' } as const

export type ProductMaterialSelection = {
  readonly id: string
  readonly digest: string
}

export type FirstAssignmentRequest = {
  readonly courseId: string
  readonly recipeVersion: typeof FIRST_ASSIGNMENT_RECIPE_VERSION
  readonly arguments: typeof FIRST_ASSIGNMENT_ARGUMENTS
  readonly materials: readonly ProductMaterialSelection[]
}

export type ProductChatRequest = {
  readonly text: string
  readonly materials: readonly ProductMaterialSelection[]
}

export type CreateProductCourseRequest = {
  readonly displayName: string
}

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

export function decodeCreateProductCourseRequest(
  value: unknown,
): CreateProductCourseRequest {
  if (
    !isExactObject(value, ['displayName']) ||
    typeof value.displayName !== 'string' ||
    !hasValidJsonEnvelope(value)
  ) {
    throw invalidContract()
  }
  return { displayName: value.displayName }
}

export function decodeFirstAssignmentRequest(
  value: unknown,
): FirstAssignmentRequest {
  if (
    !isExactObject(value, [
      'arguments',
      'courseId',
      'materials',
      'recipeVersion',
    ]) ||
    !isCourseId(value.courseId) ||
    value.recipeVersion !== FIRST_ASSIGNMENT_RECIPE_VERSION ||
    !isExactObject(value.arguments, ['timezone']) ||
    value.arguments.timezone !== FIRST_ASSIGNMENT_ARGUMENTS.timezone ||
    !isMaterialSelection(value.materials, 2, 2) ||
    !hasValidJsonEnvelope(value)
  ) {
    throw invalidContract()
  }
  return {
    courseId: value.courseId,
    recipeVersion: FIRST_ASSIGNMENT_RECIPE_VERSION,
    arguments: FIRST_ASSIGNMENT_ARGUMENTS,
    materials: value.materials,
  }
}

export function decodeProductChatRequest(value: unknown): ProductChatRequest {
  if (
    !isExactObject(value, ['materials', 'text']) ||
    typeof value.text !== 'string' ||
    value.text.trim().length === 0 ||
    !isMaterialSelection(value.materials, 0, 2) ||
    !hasValidJsonEnvelope(value)
  ) {
    throw invalidContract()
  }
  return { text: value.text, materials: value.materials }
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

function isMaterialSelection(
  value: unknown,
  minimum: number,
  maximum: number,
): value is ProductMaterialSelection[] {
  return (
    Array.isArray(value) &&
    value.length >= minimum &&
    value.length <= maximum &&
    value.every(
      (material) =>
        isExactObject(material, ['digest', 'id']) &&
        isMaterialId(material.id) &&
        isDigest(material.digest),
    ) &&
    new Set(value.map((material) => material.id)).size === value.length
  )
}
