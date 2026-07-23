import {
  parseCodexProductActivity,
  type CodexProductActivity,
} from './contract.js'
import type {
  CodexBrowserLoginAttempt,
  CodexFreshAccount,
} from './account-contract.js'

export const MAX_BRIDGE_FRAME_BYTES = 1024 * 1024

type ReadyFrame = { readonly type: 'ready' }

type ReadAccountResultFrame = {
  readonly type: 'result'
  readonly bridgeRequestId: string
  readonly command: 'read_account'
  readonly account: CodexFreshAccount
}

type StartBrowserLoginResultFrame = {
  readonly type: 'result'
  readonly bridgeRequestId: string
  readonly command: 'start_browser_login'
  readonly status: 'pending'
  readonly attemptId: string
  readonly authUrl: string
}

type ReadBrowserLoginAttemptResultFrame = {
  readonly type: 'result'
  readonly bridgeRequestId: string
  readonly command: 'read_browser_login_attempt'
} & CodexBrowserLoginAttempt

type CancelBrowserLoginResultFrame = {
  readonly type: 'result'
  readonly bridgeRequestId: string
  readonly command: 'cancel_browser_login'
  readonly status: 'cancelled' | 'already_settled'
  readonly attemptId: string
}

type ReleaseBrowserLoginAttemptResultFrame = {
  readonly type: 'result'
  readonly bridgeRequestId: string
  readonly command: 'release_browser_login_attempt'
  readonly status: 'released' | 'already_released'
  readonly attemptId: string
}

type LogoutResultFrame = {
  readonly type: 'result'
  readonly bridgeRequestId: string
  readonly command: 'logout'
  readonly status: 'signed_out'
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
  | StartBrowserLoginResultFrame
  | ReadBrowserLoginAttemptResultFrame
  | CancelBrowserLoginResultFrame
  | ReleaseBrowserLoginAttemptResultFrame
  | LogoutResultFrame
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
  if (command === 'start_browser_login') {
    requireExactKeys(frame, [
      'type',
      'bridgeRequestId',
      'command',
      'status',
      'attemptId',
      'authUrl',
    ])
    if (frame.status !== 'pending') {
      throw new BridgeProtocolError('invalid_frame')
    }
    return {
      type: 'result',
      bridgeRequestId,
      command,
      status: frame.status,
      attemptId: requireBoundedString(frame.attemptId, 256),
      authUrl: requireSafeBrowserAuthUrl(frame.authUrl),
    }
  }
  if (command === 'read_browser_login_attempt') {
    return parseBrowserLoginAttemptResult(frame, bridgeRequestId)
  }
  if (command === 'cancel_browser_login') {
    requireExactKeys(frame, [
      'type',
      'bridgeRequestId',
      'command',
      'status',
      'attemptId',
    ])
    if (
      frame.status !== 'cancelled' &&
      frame.status !== 'already_settled'
    ) {
      throw new BridgeProtocolError('invalid_frame')
    }
    return {
      type: 'result',
      bridgeRequestId,
      command,
      status: frame.status,
      attemptId: requireBoundedString(frame.attemptId, 256),
    }
  }
  if (command === 'release_browser_login_attempt') {
    requireExactKeys(frame, [
      'type',
      'bridgeRequestId',
      'command',
      'status',
      'attemptId',
    ])
    if (
      frame.status !== 'released' &&
      frame.status !== 'already_released'
    ) {
      throw new BridgeProtocolError('invalid_frame')
    }
    return {
      type: 'result',
      bridgeRequestId,
      command,
      status: frame.status,
      attemptId: requireBoundedString(frame.attemptId, 256),
    }
  }
  if (command === 'logout') {
    requireExactKeys(frame, [
      'type',
      'bridgeRequestId',
      'command',
      'status',
    ])
    if (frame.status !== 'signed_out') {
      throw new BridgeProtocolError('invalid_frame')
    }
    return {
      type: 'result',
      bridgeRequestId,
      command,
      status: frame.status,
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

function parseFreshAccount(value: unknown): CodexFreshAccount {
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

function parseBrowserLoginAttemptResult(
  frame: Record<string, unknown>,
  bridgeRequestId: string,
): ReadBrowserLoginAttemptResultFrame {
  const status = requireNonemptyString(frame.status)
  const attemptId = requireBoundedString(frame.attemptId, 256)
  if (
    status === 'pending' ||
    status === 'completed' ||
    status === 'cancelled' ||
    status === 'expired'
  ) {
    requireExactKeys(frame, [
      'type',
      'bridgeRequestId',
      'command',
      'status',
      'attemptId',
    ])
    return {
      type: 'result',
      bridgeRequestId,
      command: 'read_browser_login_attempt',
      status,
      attemptId,
    }
  }
  if (status !== 'failed') {
    throw new BridgeProtocolError('invalid_frame')
  }
  requireExactKeys(frame, [
    'type',
    'bridgeRequestId',
    'command',
    'status',
    'attemptId',
    'error',
  ])
  const error = requireRecord(frame.error)
  requireExactKeys(error, ['code', 'retryable'])
  if (
    (error.code !== 'login_start_failed' && error.code !== 'login_failed') ||
    error.retryable !== true
  ) {
    throw new BridgeProtocolError('invalid_frame')
  }
  return {
    type: 'result',
    bridgeRequestId,
    command: 'read_browser_login_attempt',
    status,
    attemptId,
    error: {
      code: error.code,
      retryable: true,
    },
  }
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

function requireBoundedString(value: unknown, maxBytes: number): string {
  const text = requireNonemptyString(value)
  if (Buffer.byteLength(text, 'utf8') > maxBytes) {
    throw new BridgeProtocolError('invalid_frame')
  }
  return text
}

function requireSafeBrowserAuthUrl(value: unknown): string {
  const text = requireBoundedString(value, 16 * 1024)
  if (/[\u0000-\u001f\u007f]/u.test(text)) {
    throw new BridgeProtocolError('invalid_frame')
  }
  let parsed: URL
  try {
    parsed = new URL(text)
  } catch {
    throw new BridgeProtocolError('invalid_frame')
  }
  const authority = text.slice('https://'.length).split(/[/?#]/u, 1)[0]
  if (
    parsed.protocol !== 'https:' ||
    (parsed.hostname !== 'auth.openai.com' &&
      parsed.hostname !== 'chatgpt.com') ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.hash !== '' ||
    authority.includes(':')
  ) {
    throw new BridgeProtocolError('invalid_frame')
  }
  return text
}
