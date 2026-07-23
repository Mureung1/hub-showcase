import {
  invalidContract,
  isExactObject,
  isNonEmptyString,
  isRecord,
} from './contract-values.js'
import {
  decodePublicPreviewAccountProjection,
  type PublicPreviewAccountProjection,
} from './account.js'
import {
  decodePublicPreviewSemesterInput,
  decodePublicPreviewSetupProjection,
  type PublicPreviewSemesterInput,
  type PublicPreviewSetupProjection,
} from './setup.js'

export type PublicPreviewBootstrap = {
  readonly account: PublicPreviewAccountProjection
  readonly setup: PublicPreviewSetupProjection
}

export type PublicPreviewCommand =
  | { readonly command: 'account.login.start' }
  | {
      readonly command: 'account.login.cancel'
      readonly attemptId: string
    }
  | { readonly command: 'account.logout' }
  | { readonly command: 'account.retry' }
  | { readonly command: 'workspace.parent.select' }
  | {
      readonly command: 'setup.prepare'
      readonly input: PublicPreviewSemesterInput
    }
  | {
      readonly command: 'setup.approve'
      readonly setupPlanId: string
    }
  | {
      readonly command: 'setup.resume'
      readonly recoveryId: string
    }
  | {
      readonly command:
        | 'setup.recover.resume'
        | 'setup.recover.discard'
        | 'setup.recover.manual_guidance'
      readonly recoveryId: string
    }

export type PublicPreviewErrorCode =
  | 'account_login_failed'
  | 'account_unavailable'
  | 'account_unsupported'
  | 'command_not_allowed'
  | 'setup_conflict'
  | 'setup_invalid_input'
  | 'setup_release_mismatch'
  | 'setup_unavailable'

export type PublicPreviewError = {
  readonly code: PublicPreviewErrorCode
  readonly displayMessage: string
  readonly retryable: boolean
}

export type PublicPreviewResponse =
  | {
      readonly status: 'ok'
      readonly projection: PublicPreviewBootstrap
    }
  | {
      readonly status: 'error'
      readonly error: PublicPreviewError
      readonly projection: PublicPreviewBootstrap
    }

export function decodePublicPreviewBootstrap(
  value: unknown,
): PublicPreviewBootstrap {
  if (!isExactObject(value, ['account', 'setup'])) throw invalidContract()
  return {
    account: decodePublicPreviewAccountProjection(value.account),
    setup: decodePublicPreviewSetupProjection(value.setup),
  }
}

export function decodePublicPreviewCommand(
  value: unknown,
): PublicPreviewCommand {
  if (!isRecord(value) || typeof value.command !== 'string') {
    throw invalidContract()
  }
  switch (value.command) {
    case 'account.login.start':
    case 'account.logout':
    case 'account.retry':
    case 'workspace.parent.select':
      if (!isExactObject(value, ['command'])) throw invalidContract()
      return { command: value.command }
    case 'account.login.cancel':
      if (
        !isExactObject(value, ['attemptId', 'command']) ||
        !isNonEmptyString(value.attemptId)
      ) {
        throw invalidContract()
      }
      return { command: 'account.login.cancel', attemptId: value.attemptId }
    case 'setup.prepare':
      if (!isExactObject(value, ['command', 'input'])) {
        throw invalidContract()
      }
      return {
        command: 'setup.prepare',
        input: decodePublicPreviewSemesterInput(value.input),
      }
    case 'setup.approve':
      if (
        !isExactObject(value, ['command', 'setupPlanId']) ||
        !isNonEmptyString(value.setupPlanId)
      ) {
        throw invalidContract()
      }
      return { command: 'setup.approve', setupPlanId: value.setupPlanId }
    case 'setup.resume':
      if (
        !isExactObject(value, ['command', 'recoveryId']) ||
        !isNonEmptyString(value.recoveryId)
      ) {
        throw invalidContract()
      }
      return { command: 'setup.resume', recoveryId: value.recoveryId }
    case 'setup.recover.resume':
    case 'setup.recover.discard':
    case 'setup.recover.manual_guidance':
      if (
        !isExactObject(value, ['command', 'recoveryId']) ||
        !isNonEmptyString(value.recoveryId)
      ) {
        throw invalidContract()
      }
      return { command: value.command, recoveryId: value.recoveryId }
    default:
      throw invalidContract()
  }
}

export function decodePublicPreviewError(
  value: unknown,
): PublicPreviewError {
  if (
    !isExactObject(value, ['code', 'displayMessage', 'retryable']) ||
    !isPublicPreviewErrorCode(value.code) ||
    !isNonEmptyString(value.displayMessage) ||
    typeof value.retryable !== 'boolean'
  ) {
    throw invalidContract()
  }
  return {
    code: value.code,
    displayMessage: value.displayMessage,
    retryable: value.retryable,
  }
}

export function decodePublicPreviewResponse(
  value: unknown,
): PublicPreviewResponse {
  if (!isRecord(value) || typeof value.status !== 'string') {
    throw invalidContract()
  }
  if (value.status === 'ok') {
    if (!isExactObject(value, ['projection', 'status'])) {
      throw invalidContract()
    }
    return {
      status: 'ok',
      projection: decodePublicPreviewBootstrap(value.projection),
    }
  }
  if (value.status === 'error') {
    if (!isExactObject(value, ['error', 'projection', 'status'])) {
      throw invalidContract()
    }
    return {
      status: 'error',
      error: decodePublicPreviewError(value.error),
      projection: decodePublicPreviewBootstrap(value.projection),
    }
  }
  throw invalidContract()
}

function isPublicPreviewErrorCode(
  value: unknown,
): value is PublicPreviewErrorCode {
  return (
    value === 'account_login_failed' ||
    value === 'account_unavailable' ||
    value === 'account_unsupported' ||
    value === 'command_not_allowed' ||
    value === 'setup_conflict' ||
    value === 'setup_invalid_input' ||
    value === 'setup_release_mismatch' ||
    value === 'setup_unavailable'
  )
}
