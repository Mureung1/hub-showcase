import {
  hasValidJsonEnvelope,
  invalidContract,
  isDecisionKey,
  isExactObject,
  isPatchId,
  isRecord,
  isRevision,
  utf8Bytes,
} from './contract-values.js'

export const PRODUCT_REVIEW_FEEDBACK_MAX_BYTES = 8 * 1024

export type ProductReviewRequest =
  | {
      readonly patchId: string
      readonly decisionKey: string
      readonly decision: 'accept' | 'reject'
    }
  | {
      readonly patchId: string
      readonly decisionKey: string
      readonly decision: 'revise'
      readonly feedback: string
    }

export type ProductReviewResponse =
  | {
      readonly patchId: string
      readonly decisionKey: string
      readonly decision: 'accepted'
      readonly outcome: 'applied'
      readonly confirmedRevision: number
      readonly replayed: boolean
      readonly continuation: 'continued' | 'lost'
    }
  | {
      readonly patchId: string
      readonly decisionKey: string
      readonly decision: 'rejected'
      readonly outcome: 'not_applied'
      readonly confirmedRevision: number
      readonly replayed: boolean
      readonly continuation: 'continued' | 'lost'
    }
  | {
      readonly patchId: string
      readonly decisionKey: string
      readonly decision: 'revision_requested'
      readonly outcome: 'replacement_pending'
      readonly confirmedRevision: number
      readonly replayed: boolean
      readonly continuation: 'continued'
    }

export function decodeProductReviewRequest(
  value: unknown,
): ProductReviewRequest {
  if (
    !isRecord(value) ||
    !isPatchId(value.patchId) ||
    !isDecisionKey(value.decisionKey) ||
    !hasValidJsonEnvelope(value)
  ) {
    throw invalidContract()
  }
  if (value.decision === 'revise') {
    if (
      !isExactObject(value, [
        'decision',
        'decisionKey',
        'feedback',
        'patchId',
      ]) ||
      typeof value.feedback !== 'string' ||
      value.feedback.trim().length === 0 ||
      utf8Bytes(value.feedback) > PRODUCT_REVIEW_FEEDBACK_MAX_BYTES
    ) {
      throw invalidContract()
    }
    return {
      patchId: value.patchId,
      decisionKey: value.decisionKey,
      decision: 'revise',
      feedback: value.feedback,
    }
  }
  if (
    !isExactObject(value, ['decision', 'decisionKey', 'patchId']) ||
    (value.decision !== 'accept' && value.decision !== 'reject')
  ) {
    throw invalidContract()
  }
  return {
    patchId: value.patchId,
    decisionKey: value.decisionKey,
    decision: value.decision,
  }
}

export function decodeProductReviewResponse(
  value: unknown,
): ProductReviewResponse {
  if (
    !isExactObject(value, [
      'confirmedRevision',
      'continuation',
      'decision',
      'decisionKey',
      'outcome',
      'patchId',
      'replayed',
    ]) ||
    !isPatchId(value.patchId) ||
    !isDecisionKey(value.decisionKey) ||
    !isRevision(value.confirmedRevision) ||
    typeof value.replayed !== 'boolean' ||
    !isReviewContinuation(value.continuation)
  ) {
    throw invalidContract()
  }
  const binding = {
    patchId: value.patchId,
    decisionKey: value.decisionKey,
    confirmedRevision: value.confirmedRevision,
    replayed: value.replayed,
    continuation: value.continuation,
  }
  if (
    value.decision === 'accepted' &&
    value.outcome === 'applied' &&
    value.continuation !== undefined
  ) {
    return { ...binding, decision: 'accepted', outcome: 'applied' }
  }
  if (
    value.decision === 'rejected' &&
    value.outcome === 'not_applied' &&
    value.continuation !== undefined
  ) {
    return { ...binding, decision: 'rejected', outcome: 'not_applied' }
  }
  if (
    value.decision === 'revision_requested' &&
    value.outcome === 'replacement_pending' &&
    value.continuation === 'continued'
  ) {
    return {
      ...binding,
      decision: 'revision_requested',
      outcome: 'replacement_pending',
      continuation: 'continued',
    }
  }
  throw invalidContract()
}

function isReviewContinuation(value: unknown): value is 'continued' | 'lost' {
  return value === 'continued' || value === 'lost'
}
