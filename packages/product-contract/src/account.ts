import {
  invalidContract,
  isExactObject,
  isNonEmptyString,
  isRecord,
} from './contract-values.js'
import {
  hasExactPublicPreviewCommands,
  isAllowedPublicPreviewAuthUrl,
} from './public-preview-values.js'

export type PublicPreviewAccountProjection =
  | {
      readonly state: 'checking'
      readonly allowedCommands: readonly []
    }
  | {
      readonly state: 'login_required'
      readonly displayMessage: string
      readonly allowedCommands: readonly [
        'account.login.start',
        'account.retry',
      ]
    }
  | {
      readonly state: 'login_starting'
      readonly displayMessage: string
      readonly allowedCommands: readonly []
    }
  | {
      readonly state: 'login_pending'
      readonly attemptId: string
      readonly authUrl: string
      readonly expiresAt: string
      readonly allowedCommands: readonly ['account.login.cancel']
    }
  | {
      readonly state: 'verifying'
      readonly displayMessage: string
      readonly allowedCommands: readonly []
    }
  | {
      readonly state: 'connected'
      readonly providerLabel: 'ChatGPT'
      readonly allowedCommands: readonly ['account.logout']
    }
  | {
      readonly state: 'unsupported_account'
      readonly displayMessage: string
      readonly allowedCommands: readonly ['account.logout']
    }
  | {
      readonly state: 'unavailable'
      readonly displayMessage: string
      readonly allowedCommands: readonly ['account.retry']
    }

export function decodePublicPreviewAccountProjection(
  value: unknown,
): PublicPreviewAccountProjection {
  if (!isRecord(value) || typeof value.state !== 'string') {
    throw invalidContract()
  }
  switch (value.state) {
    case 'checking':
      if (
        !isExactObject(value, ['allowedCommands', 'state']) ||
        !hasExactPublicPreviewCommands(value.allowedCommands, [])
      ) {
        throw invalidContract()
      }
      return { state: 'checking', allowedCommands: [] }
    case 'login_required':
      requireMessageProjection(
        value,
        ['account.login.start', 'account.retry'],
      )
      return {
        state: 'login_required',
        displayMessage: value.displayMessage as string,
        allowedCommands: ['account.login.start', 'account.retry'],
      }
    case 'login_starting':
      requireMessageProjection(value, [])
      return {
        state: 'login_starting',
        displayMessage: value.displayMessage as string,
        allowedCommands: [],
      }
    case 'login_pending':
      if (
        !isExactObject(value, [
          'allowedCommands',
          'attemptId',
          'authUrl',
          'expiresAt',
          'state',
        ]) ||
        !isNonEmptyString(value.attemptId) ||
        !isAllowedPublicPreviewAuthUrl(value.authUrl) ||
        !isNonEmptyString(value.expiresAt) ||
        !hasExactPublicPreviewCommands(value.allowedCommands, [
          'account.login.cancel',
        ])
      ) {
        throw invalidContract()
      }
      return {
        state: 'login_pending',
        attemptId: value.attemptId,
        authUrl: value.authUrl,
        expiresAt: value.expiresAt,
        allowedCommands: ['account.login.cancel'],
      }
    case 'verifying':
      requireMessageProjection(value, [])
      return {
        state: 'verifying',
        displayMessage: value.displayMessage as string,
        allowedCommands: [],
      }
    case 'connected':
      if (
        !isExactObject(value, [
          'allowedCommands',
          'providerLabel',
          'state',
        ]) ||
        value.providerLabel !== 'ChatGPT' ||
        !hasExactPublicPreviewCommands(value.allowedCommands, [
          'account.logout',
        ])
      ) {
        throw invalidContract()
      }
      return {
        state: 'connected',
        providerLabel: 'ChatGPT',
        allowedCommands: ['account.logout'],
      }
    case 'unsupported_account':
      requireMessageProjection(value, ['account.logout'])
      return {
        state: 'unsupported_account',
        displayMessage: value.displayMessage as string,
        allowedCommands: ['account.logout'],
      }
    case 'unavailable':
      requireMessageProjection(value, ['account.retry'])
      return {
        state: 'unavailable',
        displayMessage: value.displayMessage as string,
        allowedCommands: ['account.retry'],
      }
    default:
      throw invalidContract()
  }
}

function requireMessageProjection(
  value: Record<string, unknown>,
  commands: Parameters<typeof hasExactPublicPreviewCommands>[1],
): void {
  if (
    !isExactObject(value, [
      'allowedCommands',
      'displayMessage',
      'state',
    ]) ||
    !isNonEmptyString(value.displayMessage) ||
    !hasExactPublicPreviewCommands(value.allowedCommands, commands)
  ) {
    throw invalidContract()
  }
}
