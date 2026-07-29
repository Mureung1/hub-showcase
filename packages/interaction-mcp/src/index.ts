export {
  INTERACTION_BROKER_BODY_MAX_BYTES,
  INTERACTION_SAFE_MESSAGE_MAX_BYTES,
  PROPOSE_STATE_PATCH_REQUEST_MAX_BYTES,
  InteractionContractError,
} from './contract-values.js'

export {
  decodeProposeStatePatchRequest,
  decodeProposeStatePatchResult,
} from './capability.js'
export type {
  ProposeStatePatchRequest,
  ProposeStatePatchResult,
  SourceCitation,
} from './capability.js'

export {
  INTERACTION_BROKER_PROTOCOL_VERSION,
  INTERACTION_MCP_SERVER_NAME,
  PROPOSE_STATE_PATCH_CAPABILITY,
  decodeInteractionBrokerRequest,
  decodeInteractionBrokerResponse,
  parseInteractionBrokerRequest,
  parseInteractionBrokerResponse,
} from './broker-wire.js'
export type {
  InteractionBrokerErrorCode,
  InteractionBrokerRequest,
  InteractionBrokerResponse,
} from './broker-wire.js'
