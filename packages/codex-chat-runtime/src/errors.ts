export const RUNTIME_LOST_MESSAGE = 'The Codex runtime connection was lost.'
export const RUNTIME_CLOSED_MESSAGE = 'The Codex runtime is closed.'
export const RUNTIME_START_FAILED_MESSAGE = 'The Codex runtime could not start.'
export const BRIDGE_PROTOCOL_FAILED_MESSAGE =
  'The Codex bridge returned an invalid private protocol frame.'

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
