import {
  isExactObject,
  isRecord,
  isRevision,
} from './contract-values.js'

export type ProductOperationRecovery =
  | {
      readonly outcome: 'interrupted' | 'unknown'
      readonly retryable: boolean
    }
  | {
      readonly outcome: 'continuation_lost'
      readonly retryable: false
      readonly confirmedRevision: number
    }

export function isProductOperationRecovery(
  value: unknown,
): value is ProductOperationRecovery {
  return (
    isRecord(value) &&
    (((value.outcome === 'interrupted' || value.outcome === 'unknown') &&
      isExactObject(value, ['outcome', 'retryable']) &&
      typeof value.retryable === 'boolean') ||
      (value.outcome === 'continuation_lost' &&
        isExactObject(value, [
          'confirmedRevision',
          'outcome',
          'retryable',
        ]) &&
        value.retryable === false &&
        isRevision(value.confirmedRevision)))
  )
}
