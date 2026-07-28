import {
  invalidContract,
  isExactObject,
  isNonEmptyString,
  isRecord,
} from './contract-values.js'

export type ProductAccountReadiness =
  | { readonly state: 'ready' }
  | { readonly state: 'not_ready'; readonly displayMessage: string }
  | { readonly state: 'unavailable'; readonly displayMessage: string }

export function decodeProductAccountReadiness(
  value: unknown,
): ProductAccountReadiness {
  if (!isRecord(value) || typeof value.state !== 'string') {
    throw invalidContract()
  }
  if (value.state === 'ready') {
    if (!isExactObject(value, ['state'])) throw invalidContract()
    return { state: 'ready' }
  }
  if (
    (value.state !== 'not_ready' && value.state !== 'unavailable') ||
    !isExactObject(value, ['displayMessage', 'state']) ||
    !isNonEmptyString(value.displayMessage)
  ) {
    throw invalidContract()
  }
  return { state: value.state, displayMessage: value.displayMessage }
}
