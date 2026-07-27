import {
  invalidContract,
  isExactObject,
  isRecord,
  utf8Bytes,
} from './contract-values.js'

export const PRODUCT_REVIEW_EVIDENCE_MAX_BYTES = 256 * 1024
export const PRODUCT_REVIEW_REQUESTED_FRAME_MAX_BYTES = 512 * 1024

const summaryMaximumBytes = 2 * 1024
const questionMaximumBytes = 2 * 1024
const labelMaximumBytes = 256
const descriptionMaximumBytes = 2 * 1024
const beforeAfterMaximumBytes = 8 * 1024
const relativePathMaximumBytes = 4 * 1024
const quoteMaximumBytes = 16 * 1024
const contextMaximumBytes = 4 * 1024
const feedbackMaximumBytes = 8 * 1024
const maximumChanges = 32
const maximumEvidencePerChange = 8
const maximumEvidencePerReview = 16
const maximumOccurrence = 1024

export type BrowserSafeTextQuoteEvidence = {
  readonly relativePath: string
  readonly contentDigest: string
  readonly quote: string
  readonly occurrence: number
  readonly contextBefore: string
  readonly contextAfter: string
}

export type BrowserSafeSemanticReview = {
  readonly summary: string
  readonly question: string
  readonly changes: readonly {
    readonly label: string
    readonly description: string
    readonly before?: string
    readonly after?: string
    readonly evidence?: readonly BrowserSafeTextQuoteEvidence[]
  }[]
}

export type ProductReviewResult =
  | { readonly outcome: 'accept' }
  | { readonly outcome: 'revise'; readonly feedback: string }
  | { readonly outcome: 'reject'; readonly feedback?: string }

export type ProductReviewFrame =
  | {
      readonly type: 'review.requested'
      readonly operationId: string
      readonly interactionId: string
      readonly review: BrowserSafeSemanticReview
    }
  | {
      readonly type: 'review.resolved'
      readonly operationId: string
      readonly interactionId: string
      readonly result: ProductReviewResult
    }
  | {
      readonly type: 'review.failed'
      readonly operationId: string
      readonly interactionId: string
      readonly reason:
        | 'turn_interrupted'
        | 'timed_out'
        | 'runtime_terminated'
        | 'transport_failed'
    }

export function decodeBrowserSafeSemanticReview(
  value: unknown,
): BrowserSafeSemanticReview {
  if (
    !isExactObject(value, ['changes', 'question', 'summary']) ||
    !isTrimmedNonEmptyBoundedString(value.summary, summaryMaximumBytes) ||
    !isTrimmedNonEmptyBoundedString(value.question, questionMaximumBytes) ||
    !Array.isArray(value.changes) ||
    value.changes.length < 1 ||
    value.changes.length > maximumChanges
  ) {
    throw invalidContract()
  }

  const evidenceProjection: BrowserSafeTextQuoteEvidence[] = []
  for (const change of value.changes) {
    decodeChange(change, evidenceProjection)
    if (evidenceProjection.length > maximumEvidencePerReview) {
      throw invalidContract()
    }
  }
  if (!hasJsonByteBound(evidenceProjection, PRODUCT_REVIEW_EVIDENCE_MAX_BYTES)) {
    throw invalidContract()
  }
  return value as unknown as BrowserSafeSemanticReview
}

export function decodeProductReviewResult(value: unknown): ProductReviewResult {
  if (!isRecord(value)) throw invalidContract()
  if (value.outcome === 'accept') {
    if (!isExactObject(value, ['outcome'])) throw invalidContract()
    return value as { readonly outcome: 'accept' }
  }
  if (value.outcome === 'revise') {
    if (
      !isExactObject(value, ['feedback', 'outcome']) ||
      !isTrimmedNonEmptyBoundedString(value.feedback, feedbackMaximumBytes)
    ) {
      throw invalidContract()
    }
    return value as { readonly outcome: 'revise'; readonly feedback: string }
  }
  if (value.outcome === 'reject') {
    const keys = Object.hasOwn(value, 'feedback')
      ? ['feedback', 'outcome']
      : ['outcome']
    if (
      !isExactObject(value, keys) ||
      (Object.hasOwn(value, 'feedback') &&
        !isBoundedString(value.feedback, feedbackMaximumBytes))
    ) {
      throw invalidContract()
    }
    return value as {
      readonly outcome: 'reject'
      readonly feedback?: string
    }
  }
  throw invalidContract()
}

export function decodeProductReviewFrame(value: unknown): ProductReviewFrame {
  if (
    !isRecord(value) ||
    !isSemanticReviewOperationId(value.operationId) ||
    !isSemanticReviewInteractionId(value.interactionId)
  ) {
    throw invalidContract()
  }
  if (value.type === 'review.requested') {
    if (
      !isExactObject(value, [
        'interactionId',
        'operationId',
        'review',
        'type',
      ])
    ) {
      throw invalidContract()
    }
    decodeBrowserSafeSemanticReview(value.review)
    if (
      !hasJsonByteBound(value, PRODUCT_REVIEW_REQUESTED_FRAME_MAX_BYTES)
    ) {
      throw invalidContract()
    }
    return value as unknown as ProductReviewFrame
  }
  if (value.type === 'review.resolved') {
    if (
      !isExactObject(value, [
        'interactionId',
        'operationId',
        'result',
        'type',
      ])
    ) {
      throw invalidContract()
    }
    decodeProductReviewResult(value.result)
    return value as unknown as ProductReviewFrame
  }
  if (value.type === 'review.failed') {
    if (
      !isExactObject(value, [
        'interactionId',
        'operationId',
        'reason',
        'type',
      ]) ||
      !isReviewFailureReason(value.reason)
    ) {
      throw invalidContract()
    }
    return value as unknown as ProductReviewFrame
  }
  throw invalidContract()
}

function decodeChange(
  value: unknown,
  evidenceProjection: BrowserSafeTextQuoteEvidence[],
): void {
  if (!isRecord(value)) throw invalidContract()
  const keys = [
    'description',
    'label',
    ...(Object.hasOwn(value, 'after') ? ['after'] : []),
    ...(Object.hasOwn(value, 'before') ? ['before'] : []),
    ...(Object.hasOwn(value, 'evidence') ? ['evidence'] : []),
  ]
  if (
    !isExactObject(value, keys) ||
    !isTrimmedNonEmptyBoundedString(value.label, labelMaximumBytes) ||
    !isTrimmedNonEmptyBoundedString(
      value.description,
      descriptionMaximumBytes,
    )
  ) {
    throw invalidContract()
  }
  const hasBefore = Object.hasOwn(value, 'before')
  const hasAfter = Object.hasOwn(value, 'after')
  if (
    (!hasBefore && !hasAfter) ||
    (hasBefore && !isBoundedString(value.before, beforeAfterMaximumBytes)) ||
    (hasAfter && !isBoundedString(value.after, beforeAfterMaximumBytes)) ||
    (hasBefore && hasAfter && value.before === value.after)
  ) {
    throw invalidContract()
  }
  if (!Object.hasOwn(value, 'evidence')) return
  if (
    !Array.isArray(value.evidence) ||
    value.evidence.length < 1 ||
    value.evidence.length > maximumEvidencePerChange
  ) {
    throw invalidContract()
  }
  for (const evidence of value.evidence) {
    decodeEvidence(evidence)
    evidenceProjection.push(evidence as BrowserSafeTextQuoteEvidence)
  }
}

function decodeEvidence(value: unknown): void {
  if (
    !isExactObject(value, [
      'contentDigest',
      'contextAfter',
      'contextBefore',
      'occurrence',
      'quote',
      'relativePath',
    ]) ||
    !isWorkspaceRelativePath(value.relativePath) ||
    typeof value.contentDigest !== 'string' ||
    !/^[0-9a-f]{64}$/.test(value.contentDigest) ||
    !isBoundedString(value.quote, quoteMaximumBytes) ||
    value.quote.length === 0 ||
    !Number.isSafeInteger(value.occurrence) ||
    Number(value.occurrence) < 1 ||
    Number(value.occurrence) > maximumOccurrence ||
    !isBoundedString(value.contextBefore, contextMaximumBytes) ||
    !isBoundedString(value.contextAfter, contextMaximumBytes)
  ) {
    throw invalidContract()
  }
}

function isWorkspaceRelativePath(value: unknown): value is string {
  if (
    !isBoundedString(value, relativePathMaximumBytes) ||
    value.length === 0 ||
    value.startsWith('/') ||
    value.includes('\\') ||
    value.includes('\0')
  ) {
    return false
  }
  return value
    .split('/')
    .every((segment) => segment.length > 0 && segment !== '.' && segment !== '..')
}

function isSemanticReviewOperationId(value: unknown): value is string {
  return typeof value === 'string' && /^operation_[0-9a-f]{32}$/.test(value)
}

function isSemanticReviewInteractionId(value: unknown): value is string {
  return typeof value === 'string' && /^interaction_[0-9a-f]{32}$/.test(value)
}

function isReviewFailureReason(
  value: unknown,
): value is
  | 'turn_interrupted'
  | 'timed_out'
  | 'runtime_terminated'
  | 'transport_failed' {
  return (
    value === 'turn_interrupted' ||
    value === 'timed_out' ||
    value === 'runtime_terminated' ||
    value === 'transport_failed'
  )
}

function isTrimmedNonEmptyBoundedString(
  value: unknown,
  maximumBytes: number,
): value is string {
  return (
    isBoundedString(value, maximumBytes) &&
    value.trim().length > 0
  )
}

function isBoundedString(
  value: unknown,
  maximumBytes: number,
): value is string {
  return typeof value === 'string' && utf8Bytes(value) <= maximumBytes
}

function hasJsonByteBound(value: unknown, maximumBytes: number): boolean {
  try {
    return utf8Bytes(JSON.stringify(value)) <= maximumBytes
  } catch {
    return false
  }
}
