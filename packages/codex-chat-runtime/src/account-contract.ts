export const CODEX_BROWSER_LOGIN_ATTEMPT_TIMEOUT_MS = 10 * 60 * 1000

export const CODEX_BROWSER_LOGIN_OPTIONS = {
  useHostedLoginSuccessPage: true,
  appBrand: 'codex',
} as const

export type CodexRuntimeRole =
  | {
      readonly role: 'auth-only'
      readonly bootstrapCwd: string
    }
  | {
      readonly role: 'workspace'
      readonly workspaceRoot: string
    }

export type CodexFreshAccount =
  | { readonly state: 'signed_out' }
  | { readonly state: 'chatgpt' }
  | { readonly state: 'unsupported' }

export type CodexAccountFailureCode =
  | 'account_read_failed'
  | 'login_attempt_not_found'
  | 'login_cancel_failed'
  | 'login_failed'
  | 'login_start_failed'
  | 'logout_failed'
  | 'runtime_closing'
  | 'runtime_unavailable'

export type CodexAccountFailure = {
  readonly code: CodexAccountFailureCode
  readonly retryable: boolean
}

export type CodexAccountReadResult =
  | {
      readonly status: 'ok'
      readonly account: CodexFreshAccount
    }
  | {
      readonly status: 'error'
      readonly error: CodexAccountFailure
    }

export type CodexBrowserLoginStartResult =
  | {
      readonly status: 'pending'
      readonly attemptId: string
      readonly authUrl: string
      readonly expiresAt: string
    }
  | {
      readonly status: 'error'
      readonly error: CodexAccountFailure
    }

export type CodexBrowserLoginAttempt =
  | {
      readonly status: 'pending'
      readonly attemptId: string
    }
  | {
      readonly status: 'completed'
      readonly attemptId: string
    }
  | {
      readonly status: 'cancelled'
      readonly attemptId: string
    }
  | {
      readonly status: 'expired'
      readonly attemptId: string
    }
  | {
      readonly status: 'failed'
      readonly attemptId: string
      readonly error: CodexAccountFailure
    }

export type CodexBrowserLoginCancellation =
  | {
      readonly status: 'cancelled' | 'already_settled'
      readonly attemptId: string
    }
  | {
      readonly status: 'error'
      readonly attemptId: string
      readonly error: CodexAccountFailure
    }

export type CodexBrowserLoginRelease =
  | {
      readonly status: 'released' | 'already_released'
      readonly attemptId: string
    }
  | {
      readonly status: 'error'
      readonly attemptId: string
      readonly error: CodexAccountFailure
    }

export type CodexLogoutResult =
  | {
      readonly status: 'signed_out'
    }
  | {
      readonly status: 'error'
      readonly error: CodexAccountFailure
    }

export type CodexRuntimeCloseResult =
  | { readonly status: 'closed'; readonly processTreeGone: true }
  | { readonly status: 'ambiguous'; readonly processTreeGone: false }

export interface CodexAccountLifecycle {
  readonly role: CodexRuntimeRole
  readAccount(input: {
    readonly refreshToken: true
    readonly signal: AbortSignal
  }): Promise<CodexAccountReadResult>
  startBrowserLogin(input: {
    readonly attemptId: string
    readonly expiresAt: string
    readonly signal: AbortSignal
  }): Promise<CodexBrowserLoginStartResult>
  readBrowserLoginAttempt(input: {
    readonly attemptId: string
    readonly signal: AbortSignal
  }): Promise<CodexBrowserLoginAttempt>
  cancelBrowserLogin(input: {
    readonly attemptId: string
    readonly signal: AbortSignal
  }): Promise<CodexBrowserLoginCancellation>
  releaseBrowserLoginAttempt(input: {
    readonly attemptId: string
    readonly signal: AbortSignal
  }): Promise<CodexBrowserLoginRelease>
  logout(input: {
    readonly signal: AbortSignal
  }): Promise<CodexLogoutResult>
  close(input: {
    readonly signal: AbortSignal
  }): Promise<CodexRuntimeCloseResult>
}

export type CodexEffectiveConfig = {
  readonly projectRootMarkers: readonly string[]
  readonly globalInstructionsFile: string | null
}

export type CodexEffectiveSkill = {
  readonly name: string
  readonly enabled: boolean
  readonly sourceRoot: string
}

export interface CodexNativeContextPort {
  readEffectiveConfig(input: {
    readonly signal: AbortSignal
  }): Promise<CodexEffectiveConfig>
  listEffectiveSkills(input: {
    readonly signal: AbortSignal
  }): Promise<readonly CodexEffectiveSkill[]>
}
