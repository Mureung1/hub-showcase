import {
  PROPOSE_STATE_PATCH_REQUEST_MAX_BYTES,
  hasJsonByteBound,
  invalidContract,
  isBoundedString,
  isExactObject,
  isRecord,
  isTrimmedNonEmptyBoundedString,
} from './contract-values.js'

const summaryMaximumBytes = 2 * 1024
const questionMaximumBytes = 2 * 1024
const labelMaximumBytes = 256
const descriptionMaximumBytes = 2 * 1024
const beforeAfterMaximumBytes = 8 * 1024
const relativePathMaximumBytes = 4 * 1024
const excerptMaximumBytes = 16 * 1024
const locationHintMaximumBytes = 2 * 1024
const feedbackMaximumBytes = 8 * 1024
const maximumChanges = 32
const maximumCitationsPerChange = 8
const maximumCitationsPerRequest = 16

export type SourceCitation = {
  readonly relativePath: string
  readonly excerpt: string
  readonly locationHint?: string
}

export type ProposeStatePatchRequest = {
  readonly summary: string
  readonly question: string
  readonly changes: readonly {
    readonly label: string
    readonly description: string
    readonly before?: string
    readonly after?: string
    readonly citations?: readonly SourceCitation[]
  }[]
}

export type ProposeStatePatchResult =
  | { readonly outcome: 'accept' }
  | { readonly outcome: 'revise'; readonly feedback: string }
  | { readonly outcome: 'reject'; readonly feedback?: string }

export function decodeProposeStatePatchRequest(
  value: unknown,
): ProposeStatePatchRequest {
  if (
    !isExactObject(value, ['changes', 'question', 'summary']) ||
    !isTrimmedNonEmptyBoundedString(value.summary, summaryMaximumBytes) ||
    !isTrimmedNonEmptyBoundedString(value.question, questionMaximumBytes) ||
    !Array.isArray(value.changes) ||
    value.changes.length < 1 ||
    value.changes.length > maximumChanges ||
    !hasJsonByteBound(value, PROPOSE_STATE_PATCH_REQUEST_MAX_BYTES)
  ) {
    throw invalidContract()
  }

  let citationCount = 0
  for (const change of value.changes) {
    citationCount += decodeChange(change)
    if (citationCount > maximumCitationsPerRequest) throw invalidContract()
  }
  return value as unknown as ProposeStatePatchRequest
}

export function decodeProposeStatePatchResult(
  value: unknown,
): ProposeStatePatchResult {
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

function decodeChange(value: unknown): number {
  if (!isRecord(value)) throw invalidContract()
  const keys = [
    'description',
    'label',
    ...(Object.hasOwn(value, 'after') ? ['after'] : []),
    ...(Object.hasOwn(value, 'before') ? ['before'] : []),
    ...(Object.hasOwn(value, 'citations') ? ['citations'] : []),
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

  if (!Object.hasOwn(value, 'citations')) return 0
  if (
    !Array.isArray(value.citations) ||
    value.citations.length < 1 ||
    value.citations.length > maximumCitationsPerChange
  ) {
    throw invalidContract()
  }
  for (const citation of value.citations) decodeCitation(citation)
  return value.citations.length
}

function decodeCitation(value: unknown): void {
  if (!isRecord(value)) throw invalidContract()
  const keys = [
    'excerpt',
    ...(Object.hasOwn(value, 'locationHint') ? ['locationHint'] : []),
    'relativePath',
  ]
  if (
    !isExactObject(value, keys) ||
    !isWorkspaceRelativePath(value.relativePath) ||
    !isTrimmedNonEmptyBoundedString(value.excerpt, excerptMaximumBytes) ||
    (Object.hasOwn(value, 'locationHint') &&
      !isTrimmedNonEmptyBoundedString(
        value.locationHint,
        locationHintMaximumBytes,
      ))
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
