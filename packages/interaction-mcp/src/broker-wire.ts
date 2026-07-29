import {
  INTERACTION_BROKER_BODY_MAX_BYTES,
  INTERACTION_SAFE_MESSAGE_MAX_BYTES,
  invalidContract,
  isExactObject,
  isTrimmedNonEmptyBoundedString,
  utf8Bytes,
} from './contract-values.js'
import {
  decodeProposeStatePatchRequest,
  decodeProposeStatePatchResult,
  type ProposeStatePatchRequest,
  type ProposeStatePatchResult,
} from './capability.js'

export const INTERACTION_BROKER_PROTOCOL_VERSION = 2
export const INTERACTION_MCP_SERVER_NAME = 'ay_ple_interaction'
export const PROPOSE_STATE_PATCH_CAPABILITY = 'propose_state_patch'

export type InteractionBrokerErrorCode =
  | 'invalid_request'
  | 'forbidden'
  | 'busy'
  | 'citation_invalid'
  | 'interaction_interrupted'
  | 'runtime_inactive'
  | 'broker_unavailable'

export type InteractionBrokerRequest =
  | {
      readonly protocolVersion: 2
      readonly kind: 'handshake'
      readonly serverName: 'ay_ple_interaction'
      readonly capabilities: readonly ['propose_state_patch']
    }
  | {
      readonly protocolVersion: 2
      readonly kind: 'lifecycle_open'
    }
  | {
      readonly protocolVersion: 2
      readonly kind: 'capability_call'
      readonly capability: 'propose_state_patch'
      readonly request: ProposeStatePatchRequest
    }

export type InteractionBrokerResponse =
  | {
      readonly protocolVersion: 2
      readonly kind: 'handshake_accepted'
    }
  | {
      readonly protocolVersion: 2
      readonly kind: 'lifecycle_accepted'
    }
  | {
      readonly protocolVersion: 2
      readonly kind: 'capability_result'
      readonly capability: 'propose_state_patch'
      readonly result: ProposeStatePatchResult
    }
  | {
      readonly protocolVersion: 2
      readonly kind: 'error'
      readonly code: InteractionBrokerErrorCode
      readonly displayMessage: string
    }

const errorCodes = new Set<InteractionBrokerErrorCode>([
  'invalid_request',
  'forbidden',
  'busy',
  'citation_invalid',
  'interaction_interrupted',
  'runtime_inactive',
  'broker_unavailable',
])

export function parseInteractionBrokerRequest(
  body: string | Uint8Array,
): InteractionBrokerRequest {
  return decodeInteractionBrokerRequest(parseBrokerBody(body))
}

export function parseInteractionBrokerResponse(
  body: string | Uint8Array,
): InteractionBrokerResponse {
  return decodeInteractionBrokerResponse(parseBrokerBody(body))
}

export function decodeInteractionBrokerRequest(
  value: unknown,
): InteractionBrokerRequest {
  if (
    isExactObject(value, ['kind', 'protocolVersion']) &&
    value.protocolVersion === INTERACTION_BROKER_PROTOCOL_VERSION &&
    value.kind === 'lifecycle_open'
  ) {
    return value as unknown as InteractionBrokerRequest
  }

  if (
    isExactObject(value, [
      'capabilities',
      'kind',
      'protocolVersion',
      'serverName',
    ]) &&
    value.protocolVersion === INTERACTION_BROKER_PROTOCOL_VERSION &&
    value.kind === 'handshake' &&
    value.serverName === INTERACTION_MCP_SERVER_NAME &&
    Array.isArray(value.capabilities) &&
    value.capabilities.length === 1 &&
    value.capabilities[0] === PROPOSE_STATE_PATCH_CAPABILITY
  ) {
    return value as unknown as InteractionBrokerRequest
  }

  if (
    isExactObject(value, [
      'capability',
      'kind',
      'protocolVersion',
      'request',
    ]) &&
    value.protocolVersion === INTERACTION_BROKER_PROTOCOL_VERSION &&
    value.kind === 'capability_call' &&
    value.capability === PROPOSE_STATE_PATCH_CAPABILITY
  ) {
    decodeProposeStatePatchRequest(value.request)
    return value as unknown as InteractionBrokerRequest
  }
  throw invalidContract()
}

export function decodeInteractionBrokerResponse(
  value: unknown,
): InteractionBrokerResponse {
  if (
    isExactObject(value, ['kind', 'protocolVersion']) &&
    value.protocolVersion === INTERACTION_BROKER_PROTOCOL_VERSION &&
    value.kind === 'handshake_accepted'
  ) {
    return value as unknown as InteractionBrokerResponse
  }

  if (
    isExactObject(value, ['kind', 'protocolVersion']) &&
    value.protocolVersion === INTERACTION_BROKER_PROTOCOL_VERSION &&
    value.kind === 'lifecycle_accepted'
  ) {
    return value as unknown as InteractionBrokerResponse
  }

  if (
    isExactObject(value, [
      'capability',
      'kind',
      'protocolVersion',
      'result',
    ]) &&
    value.protocolVersion === INTERACTION_BROKER_PROTOCOL_VERSION &&
    value.kind === 'capability_result' &&
    value.capability === PROPOSE_STATE_PATCH_CAPABILITY
  ) {
    decodeProposeStatePatchResult(value.result)
    return value as unknown as InteractionBrokerResponse
  }

  if (
    isExactObject(value, [
      'code',
      'displayMessage',
      'kind',
      'protocolVersion',
    ]) &&
    value.protocolVersion === INTERACTION_BROKER_PROTOCOL_VERSION &&
    value.kind === 'error' &&
    errorCodes.has(value.code as InteractionBrokerErrorCode) &&
    isTrimmedNonEmptyBoundedString(
      value.displayMessage,
      INTERACTION_SAFE_MESSAGE_MAX_BYTES,
    )
  ) {
    return value as unknown as InteractionBrokerResponse
  }
  throw invalidContract()
}

function parseBrokerBody(body: string | Uint8Array): unknown {
  const bytes =
    typeof body === 'string' ? utf8Bytes(body) : body.byteLength
  if (bytes > INTERACTION_BROKER_BODY_MAX_BYTES) throw invalidContract()
  try {
    const text =
      typeof body === 'string'
        ? body
        : new TextDecoder('utf-8', { fatal: true }).decode(body)
    return JSON.parse(text) as unknown
  } catch {
    throw invalidContract()
  }
}
