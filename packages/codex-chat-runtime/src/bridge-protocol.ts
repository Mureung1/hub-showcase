import {
  parseCodexProductActivity,
  type CodexProductActivity,
} from './contract.js'
import type { CodexModelCatalog } from './runtime-contract.js'

export const MAX_BRIDGE_FRAME_BYTES = 1024 * 1024

type ReadyFrame = { readonly type: 'ready' }

type ReadAccountResultFrame = {
  readonly type: 'result'
  readonly bridgeRequestId: string
  readonly command: 'read_account'
  readonly account:
    | { readonly state: 'signed_out' }
    | { readonly state: 'chatgpt' }
    | { readonly state: 'unsupported' }
}

type ReadModelCatalogResultFrame = {
  readonly type: 'result'
  readonly bridgeRequestId: string
  readonly command: 'read_model_catalog'
  readonly catalog: CodexModelCatalog
}

type WaitForMcpServerReadyResultFrame = {
  readonly type: 'result'
  readonly bridgeRequestId: string
  readonly command: 'wait_for_mcp_server_ready'
}

type StartThreadResultFrame = {
  readonly type: 'result'
  readonly bridgeRequestId: string
  readonly command: 'start_thread'
  readonly threadId: string
}

type StartTurnResultFrame = {
  readonly type: 'result'
  readonly bridgeRequestId: string
  readonly command: 'start_turn'
  readonly threadId: string
  readonly turnId: string
}

type StartProductTurnResultFrame = {
  readonly type: 'result'
  readonly bridgeRequestId: string
  readonly command: 'start_product_turn'
  readonly threadId: string
  readonly turnId: string
}

type UserInputSettlementResultFrame = {
  readonly type: 'result'
  readonly bridgeRequestId: string
  readonly command: 'answer_user_input' | 'cancel_user_input'
  readonly interactionId: string
}

type InterruptResultFrame = {
  readonly type: 'result'
  readonly bridgeRequestId: string
  readonly command: 'interrupt'
  readonly threadId: string
  readonly turnId: string
}

type ReleaseThreadResultFrame = {
  readonly type: 'result'
  readonly bridgeRequestId: string
  readonly command: 'release_thread'
  readonly threadId: string
}

type ErrorFrame = {
  readonly type: 'error'
  readonly bridgeRequestId: string
  readonly code: string
  readonly displayMessage: string
}

type EventFrame = {
  readonly type: 'event'
  readonly bridgeRequestId: string
  readonly event: CodexProductActivity
}

type FatalFrame = {
  readonly type: 'fatal'
  readonly code: string
  readonly displayMessage: string
}

type CloseAckFrame = {
  readonly type: 'close_ack'
  readonly bridgeRequestId: string
}

export type BridgeOutputFrame =
  | ReadyFrame
  | ReadAccountResultFrame
  | ReadModelCatalogResultFrame
  | WaitForMcpServerReadyResultFrame
  | StartThreadResultFrame
  | StartTurnResultFrame
  | StartProductTurnResultFrame
  | UserInputSettlementResultFrame
  | InterruptResultFrame
  | ReleaseThreadResultFrame
  | ErrorFrame
  | EventFrame
  | FatalFrame
  | CloseAckFrame

export interface MeasuredBridgeOutputFrame {
  readonly frame: BridgeOutputFrame
  readonly byteLength: number
}

export class BridgeProtocolError extends Error {
  readonly code: string

  constructor(code: string) {
    super('The Codex bridge protocol was invalid.')
    this.name = 'BridgeProtocolError'
    this.code = code
  }
}

export class NdjsonBridgeFramer {
  private buffered = Buffer.alloc(0)
  private finished = false

  push(chunk: Buffer): BridgeOutputFrame[] {
    return Array.from(this.pushMeasured(chunk), ({ frame }) => frame)
  }

  *pushMeasured(chunk: Buffer): IterableIterator<MeasuredBridgeOutputFrame> {
    if (this.finished) throw new BridgeProtocolError('frame_after_eof')
    if (chunk.length === 0) return
    this.buffered = Buffer.concat([this.buffered, chunk])
    while (true) {
      const newline = this.buffered.indexOf(0x0a)
      if (newline === -1) break
      const line = this.buffered.subarray(0, newline + 1)
      this.buffered = this.buffered.subarray(newline + 1)
      yield {
        frame: decodeBridgeOutputFrame(line),
        byteLength: line.byteLength,
      }
    }
    if (this.buffered.length >= MAX_BRIDGE_FRAME_BYTES) {
      throw new BridgeProtocolError('frame_too_large')
    }
  }

  finish(): void {
    if (this.finished) return
    this.finished = true
    if (this.buffered.length !== 0) {
      throw new BridgeProtocolError('incomplete_frame')
    }
  }
}

export function decodeBridgeOutputFrame(line: Buffer): BridgeOutputFrame {
  if (
    line.length === 0 ||
    line.length > MAX_BRIDGE_FRAME_BYTES ||
    line[line.length - 1] !== 0x0a
  ) {
    throw new BridgeProtocolError(
      line.length > MAX_BRIDGE_FRAME_BYTES ? 'frame_too_large' : 'invalid_frame',
    )
  }
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(
      line.subarray(0, line.length - 1),
    )
  } catch {
    throw new BridgeProtocolError('invalid_utf8')
  }
  let decoded: unknown
  try {
    decoded = JSON.parse(text)
  } catch {
    throw new BridgeProtocolError('malformed_json')
  }
  try {
    return parseFrame(decoded)
  } catch (error) {
    if (error instanceof BridgeProtocolError) throw error
    throw new BridgeProtocolError('invalid_frame')
  }
}

function parseFrame(value: unknown): BridgeOutputFrame {
  const frame = requireRecord(value)
  const type = requireNonemptyString(frame.type)
  if (type === 'ready') {
    requireExactKeys(frame, ['type'])
    return { type }
  }
  if (type === 'result') return parseResult(frame)
  if (type === 'error') {
    requireExactKeys(frame, [
      'type',
      'bridgeRequestId',
      'code',
      'displayMessage',
    ])
    return {
      type,
      bridgeRequestId: requireNonemptyString(frame.bridgeRequestId),
      code: requireNonemptyString(frame.code),
      displayMessage: requireNonemptyString(frame.displayMessage),
    }
  }
  if (type === 'event') {
    requireExactKeys(frame, ['type', 'bridgeRequestId', 'event'])
    return {
      type,
      bridgeRequestId: requireNonemptyString(frame.bridgeRequestId),
      event: parseCodexProductActivity(frame.event),
    }
  }
  if (type === 'fatal') {
    requireExactKeys(frame, ['type', 'code', 'displayMessage'])
    return {
      type,
      code: requireNonemptyString(frame.code),
      displayMessage: requireNonemptyString(frame.displayMessage),
    }
  }
  if (type === 'close_ack') {
    requireExactKeys(frame, ['type', 'bridgeRequestId'])
    return {
      type,
      bridgeRequestId: requireNonemptyString(frame.bridgeRequestId),
    }
  }
  throw new BridgeProtocolError('invalid_frame')
}

function parseResult(frame: Record<string, unknown>): BridgeOutputFrame {
  const command = requireNonemptyString(frame.command)
  const bridgeRequestId = requireNonemptyString(frame.bridgeRequestId)
  if (command === 'read_account') {
    requireExactKeys(frame, [
      'type',
      'bridgeRequestId',
      'command',
      'account',
    ])
    return {
      type: 'result',
      bridgeRequestId,
      command,
      account: parseFreshAccount(frame.account),
    }
  }
  if (command === 'read_model_catalog') {
    requireExactKeys(frame, [
      'type',
      'bridgeRequestId',
      'command',
      'catalog',
    ])
    return {
      type: 'result',
      bridgeRequestId,
      command,
      catalog: parseModelCatalog(frame.catalog),
    }
  }
  if (command === 'wait_for_mcp_server_ready') {
    requireExactKeys(frame, [
      'type',
      'bridgeRequestId',
      'command',
    ])
    return {
      type: 'result',
      bridgeRequestId,
      command,
    }
  }
  if (command === 'start_thread') {
    requireExactKeys(frame, [
      'type',
      'bridgeRequestId',
      'command',
      'threadId',
    ])
    return {
      type: 'result',
      bridgeRequestId,
      command,
      threadId: requireNonemptyString(frame.threadId),
    }
  }
  if (
    command === 'start_turn' ||
    command === 'start_product_turn' ||
    command === 'interrupt'
  ) {
    requireExactKeys(frame, [
      'type',
      'bridgeRequestId',
      'command',
      'threadId',
      'turnId',
    ])
    return {
      type: 'result',
      bridgeRequestId,
      command,
      threadId: requireNonemptyString(frame.threadId),
      turnId: requireNonemptyString(frame.turnId),
    }
  }
  if (command === 'answer_user_input' || command === 'cancel_user_input') {
    requireExactKeys(frame, [
      'type',
      'bridgeRequestId',
      'command',
      'interactionId',
    ])
    return {
      type: 'result',
      bridgeRequestId,
      command,
      interactionId: requireNonemptyString(frame.interactionId),
    }
  }
  if (command === 'release_thread') {
    requireExactKeys(frame, [
      'type',
      'bridgeRequestId',
      'command',
      'threadId',
    ])
    return {
      type: 'result',
      bridgeRequestId,
      command,
      threadId: requireNonemptyString(frame.threadId),
    }
  }
  throw new BridgeProtocolError('invalid_frame')
}

function parseModelCatalog(value: unknown): CodexModelCatalog {
  const record = requireRecord(value)
  requireExactKeys(record, ['models'])
  if (
    !Array.isArray(record.models) ||
    record.models.length > 128
  ) {
    throw new BridgeProtocolError('invalid_frame')
  }
  return { models: record.models.map(parseModelCatalogEntry) }
}

function parseModelCatalogEntry(
  value: unknown,
): CodexModelCatalog['models'][number] {
  const record = requireRecord(value)
  const fields = [
    'defaultReasoningEffort',
    'description',
    'displayName',
    'isDefault',
    'model',
    'serviceTiers',
    'supportedReasoningEfforts',
    ...(record.defaultServiceTier === undefined
      ? []
      : ['defaultServiceTier']),
  ]
  requireExactKeys(record, fields)
  if (
    typeof record.description !== 'string' ||
    typeof record.isDefault !== 'boolean' ||
    !Array.isArray(record.supportedReasoningEfforts) ||
    record.supportedReasoningEfforts.length === 0 ||
    record.supportedReasoningEfforts.length > 16 ||
    !Array.isArray(record.serviceTiers) ||
    !record.serviceTiers.every(
      (tier): tier is string =>
        typeof tier === 'string' && tier.length > 0,
    )
  ) {
    throw new BridgeProtocolError('invalid_frame')
  }
  const entry = {
    model: requireNonemptyString(record.model),
    displayName: requireNonemptyString(record.displayName),
    description: record.description,
    isDefault: record.isDefault,
    defaultReasoningEffort: requireNonemptyString(
      record.defaultReasoningEffort,
    ),
    supportedReasoningEfforts: record.supportedReasoningEfforts.map(
      parseModelReasoningEffort,
    ),
    serviceTiers: record.serviceTiers,
    ...(record.defaultServiceTier === undefined
      ? {}
      : {
          defaultServiceTier: requireNonemptyString(
            record.defaultServiceTier,
          ),
        }),
  }
  if (
    !entry.supportedReasoningEfforts.some(
      ({ reasoningEffort }) =>
        reasoningEffort === entry.defaultReasoningEffort,
    )
  ) {
    throw new BridgeProtocolError('invalid_frame')
  }
  return entry
}

function parseModelReasoningEffort(
  value: unknown,
): CodexModelCatalog['models'][number]['supportedReasoningEfforts'][number] {
  const record = requireRecord(value)
  requireExactKeys(record, ['description', 'reasoningEffort'])
  if (typeof record.description !== 'string') {
    throw new BridgeProtocolError('invalid_frame')
  }
  return {
    reasoningEffort: requireNonemptyString(record.reasoningEffort),
    description: record.description,
  }
}

function parseFreshAccount(value: unknown): ReadAccountResultFrame['account'] {
  const account = requireRecord(value)
  requireExactKeys(account, ['state'])
  if (
    account.state !== 'signed_out' &&
    account.state !== 'chatgpt' &&
    account.state !== 'unsupported'
  ) {
    throw new BridgeProtocolError('invalid_frame')
  }
  return { state: account.state }
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BridgeProtocolError('invalid_frame')
  }
  return value as Record<string, unknown>
}

function requireExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): void {
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    throw new BridgeProtocolError('invalid_frame')
  }
}

function requireNonemptyString(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new BridgeProtocolError('invalid_frame')
  }
  return value
}
