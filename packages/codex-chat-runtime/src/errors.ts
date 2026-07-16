export const RUNTIME_LOST_MESSAGE = 'The Codex runtime connection was lost.'
export const RUNTIME_CLOSED_MESSAGE = 'The Codex runtime is closed.'
export const RUNTIME_START_FAILED_MESSAGE = 'The Codex runtime could not start.'
export const RUNTIME_START_TIMEOUT_MESSAGE =
  'The Codex runtime did not start before its deadline.'
export const RUNTIME_RESPONSE_TIMEOUT_MESSAGE =
  'The Codex runtime did not respond before its deadline.'
export const RUNTIME_STREAM_IDLE_TIMEOUT_MESSAGE =
  'The Codex turn stream became unresponsive.'
export const RUNTIME_STREAM_TOTAL_TIMEOUT_MESSAGE =
  'The Codex turn exceeded its total runtime limit.'
export const RUNTIME_CLOSE_TIMEOUT_MESSAGE =
  'The Codex runtime did not close before its deadline.'
export const RUNTIME_CLEANUP_FAILED_MESSAGE =
  'The Codex runtime process tree could not be cleaned up.'
export const BRIDGE_PROTOCOL_FAILED_MESSAGE =
  'The Codex bridge returned an invalid private protocol frame.'
export const BRIDGE_RUNTIME_FAILED_MESSAGE =
  'The Codex bridge terminated because its private protocol failed.'
export const BUFFER_OVERFLOW_MESSAGE =
  'The Codex runtime buffer limit was exceeded.'

export class CodexChatRuntimeError extends Error {
  readonly code: string
  readonly displayMessage: string
  readonly unknownOutcome: boolean

  constructor(options: {
    code: string
    displayMessage: string
    unknownOutcome: boolean
  }) {
    super(options.displayMessage)
    this.name = 'CodexChatRuntimeError'
    this.code = options.code
    this.displayMessage = options.displayMessage
    this.unknownOutcome = options.unknownOutcome
  }
}
