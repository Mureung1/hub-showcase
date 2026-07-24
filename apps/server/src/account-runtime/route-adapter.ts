import {
  CODEX_BROWSER_LOGIN_ATTEMPT_TIMEOUT_MS,
  type CodexAccountLifecycle,
  type CodexBrowserLoginAttempt,
  type CodexFreshAccount,
} from '@ay-ple/codex-chat-runtime'
import {
  decodePublicPreviewAccountProjection,
  type PublicPreviewAccountProjection,
  type PublicPreviewCommand,
} from '@ay-ple/product-contract'

import type {
  AccountRuntimeCoordinator,
  AccountRuntimeOperationResult,
} from './contract.js'

export type AccountRuntimeCommand = Extract<
  PublicPreviewCommand,
  {
    readonly command:
      | 'account.login.start'
      | 'account.login.cancel'
      | 'account.logout'
      | 'account.retry'
  }
>

export interface AccountRuntimeRouteAdapter {
  observe(input: {
    readonly signal: AbortSignal
  }): Promise<PublicPreviewAccountProjection>
  dispatch(input: {
    readonly command: AccountRuntimeCommand
    readonly signal: AbortSignal
  }): Promise<PublicPreviewAccountProjection>
  hasPendingAttempt(): boolean
  beginShutdown(): void
}

export type CreateAccountRuntimeRouteAdapterOptions = {
  readonly coordinator: Pick<
    AccountRuntimeCoordinator<CodexFreshAccount, unknown, unknown>,
    'logout' | 'runAccountOperation'
  >
  readonly currentAccountRuntime: (input: {
    readonly signal: AbortSignal
  }) => Promise<CodexAccountLifecycle>
  readonly attemptId: () => string
  readonly now: () => Date
  readonly wait: (milliseconds: number, signal: AbortSignal) => Promise<void>
  readonly verificationAttempts?: number
  readonly verificationIntervalMs?: number
}

export class AccountRuntimeCommandError extends Error {
  readonly code: 'command_not_allowed'

  constructor() {
    super('command_not_allowed')
    this.name = 'AccountRuntimeCommandError'
    this.code = 'command_not_allowed'
  }
}

type TerminalLoginAttempt = Exclude<
  CodexBrowserLoginAttempt,
  { readonly status: 'pending' }
>

type LoginAttemptState = {
  readonly attemptId: string
  readonly expiresAt: string
  authUrl?: string
  terminal?: TerminalLoginAttempt
}

type AttemptFinalization =
  | {
      readonly status: 'released'
      readonly account: CodexFreshAccount | undefined
      readonly terminal: TerminalLoginAttempt
    }
  | {
      readonly status: 'protected'
    }

export function createAccountRuntimeRouteAdapter(
  options: CreateAccountRuntimeRouteAdapterOptions,
): AccountRuntimeRouteAdapter {
  const verificationAttempts = Math.max(
    1,
    options.verificationAttempts ?? 3,
  )
  const verificationIntervalMs = Math.max(
    0,
    options.verificationIntervalMs ?? 100,
  )
  const ownedOperations = new Set<AbortController>()
  let projection: PublicPreviewAccountProjection = checkingProjection()
  let attempt: LoginAttemptState | undefined
  let accountReadFlight: Promise<PublicPreviewAccountProjection> | undefined
  let startFlight: Promise<PublicPreviewAccountProjection> | undefined
  let attemptFlight: Promise<PublicPreviewAccountProjection> | undefined
  let shuttingDown = false

  const readFreshAccount = (
    requestSignal: AbortSignal,
  ): Promise<PublicPreviewAccountProjection> => {
    if (accountReadFlight) return accountReadFlight
    if (requestSignal.aborted) {
      return Promise.resolve(cloneProjection(unavailableProjection()))
    }
    const controller = ownOperation(ownedOperations)
    accountReadFlight = (async () => {
      const result = await options.coordinator.runAccountOperation({
        signal: controller.signal,
        operation: async () => {
          const runtime = await options.currentAccountRuntime({
            signal: controller.signal,
          })
          return runtime.readAccount({
            refreshToken: true,
            signal: controller.signal,
          })
        },
      })
      projection = projectAccountRead(result)
      return cloneProjection(projection)
    })()
    void accountReadFlight.finally(() => {
      controller.release()
      accountReadFlight = undefined
    })
    return accountReadFlight
  }

  const finalizeAttemptOnRuntime = async (
    runtime: CodexAccountLifecycle,
    currentAttempt: LoginAttemptState,
    terminal: TerminalLoginAttempt,
    signal: AbortSignal,
  ): Promise<AttemptFinalization> => {
    let account: CodexFreshAccount | undefined
    for (let index = 0; index < verificationAttempts; index += 1) {
      const read = await runtime.readAccount({
        refreshToken: true,
        signal,
      })
      if (read.status === 'error') break
      account = read.account
      if (account.state !== 'signed_out') break
      if (index + 1 < verificationAttempts) {
        await options.wait(verificationIntervalMs, signal)
      }
    }
    const release = await runtime.releaseBrowserLoginAttempt({
      attemptId: currentAttempt.attemptId,
      signal,
    })
    if (
      release.status === 'error' ||
      release.attemptId !== currentAttempt.attemptId
    ) {
      return { status: 'protected' }
    }
    return { status: 'released', account, terminal }
  }

  const applyFinalization = (
    currentAttempt: LoginAttemptState,
    finalization: AttemptFinalization,
  ): PublicPreviewAccountProjection => {
    if (attempt !== currentAttempt || finalization.status === 'protected') {
      projection = unavailableProjection()
      return cloneProjection(projection)
    }
    attempt = undefined
    projection = finalization.account
      ? projectFreshAccount(
          finalization.account,
          signedOutMessage(finalization.terminal),
        )
      : unavailableProjection()
    return cloneProjection(projection)
  }

  const finalizeAttempt = async (
    currentAttempt: LoginAttemptState,
    terminal: TerminalLoginAttempt,
    signal: AbortSignal,
  ): Promise<PublicPreviewAccountProjection> => {
    const result = await options.coordinator.runAccountOperation({
      signal,
      operation: async () => {
        const runtime = await options.currentAccountRuntime({ signal })
        return finalizeAttemptOnRuntime(
          runtime,
          currentAttempt,
          terminal,
          signal,
        )
      },
    })
    if (result.status === 'failed') {
      projection = unavailableProjection()
      return cloneProjection(projection)
    }
    return applyFinalization(currentAttempt, result.result)
  }

  const startOwnedAttemptFinalization = (
    currentAttempt: LoginAttemptState,
    terminal: TerminalLoginAttempt,
  ): void => {
    if (attemptFlight || shuttingDown) return
    const controller = ownOperation(ownedOperations)
    const flight = finalizeAttempt(
      currentAttempt,
      terminal,
      controller.signal,
    )
    attemptFlight = flight
    void flight.finally(() => {
      controller.release()
      if (attemptFlight === flight) attemptFlight = undefined
    })
  }

  const observeAttempt = async (
    currentAttempt: LoginAttemptState,
    signal: AbortSignal,
  ): Promise<PublicPreviewAccountProjection> => {
    const result = await options.coordinator.runAccountOperation({
      signal,
      operation: async () => {
        const runtime = await options.currentAccountRuntime({ signal })
        return runtime.readBrowserLoginAttempt({
          attemptId: currentAttempt.attemptId,
          signal,
        })
      },
    })
    if (
      result.status === 'failed' ||
      result.result.attemptId !== currentAttempt.attemptId
    ) {
      projection = unavailableProjection()
      return cloneProjection(projection)
    }
    if (result.result.status === 'pending') {
      try {
        projection = currentAttempt.authUrl
          ? loginPendingProjection(currentAttempt)
          : unavailableProjection()
      } catch {
        projection = unavailableProjection()
      }
      return cloneProjection(projection)
    }

    currentAttempt.terminal = result.result
    projection = verifyingProjection()
    startOwnedAttemptFinalization(currentAttempt, result.result)
    return cloneProjection(projection)
  }

  const inspectAttempt = (
    currentAttempt: LoginAttemptState,
    requestSignal: AbortSignal,
  ): Promise<PublicPreviewAccountProjection> => {
    if (attemptFlight) return Promise.resolve(cloneProjection(projection))
    if (requestSignal.aborted) {
      return Promise.resolve(cloneProjection(unavailableProjection()))
    }
    const controller = ownOperation(ownedOperations)
    const flight = observeAttempt(currentAttempt, controller.signal)
    attemptFlight = flight
    void flight.finally(() => {
      controller.release()
      if (attemptFlight === flight) attemptFlight = undefined
      if (
        attempt === currentAttempt &&
        currentAttempt.terminal &&
        projection.state === 'verifying'
      ) {
        startOwnedAttemptFinalization(
          currentAttempt,
          currentAttempt.terminal,
        )
      }
    })
    return flight
  }

  const startLogin = (
    requestSignal: AbortSignal,
  ): Promise<PublicPreviewAccountProjection> => {
    if (startFlight) return startFlight
    if (attempt) return Promise.resolve(cloneProjection(projection))
    requireAllowed(projection, 'account.login.start')
    if (requestSignal.aborted) {
      return Promise.resolve(cloneProjection(unavailableProjection()))
    }

    const currentAttempt: LoginAttemptState = {
      attemptId: options.attemptId(),
      expiresAt: new Date(
        options.now().getTime() + CODEX_BROWSER_LOGIN_ATTEMPT_TIMEOUT_MS,
      ).toISOString(),
    }
    attempt = currentAttempt
    projection = loginStartingProjection()
    const controller = ownOperation(ownedOperations)
    let nativeStartInvoked = false
    const flight = (async () => {
      const result = await options.coordinator.runAccountOperation({
        signal: controller.signal,
        operation: async () => {
          const runtime = await options.currentAccountRuntime({
            signal: controller.signal,
          })
          const account = await runtime.readAccount({
            refreshToken: true,
            signal: controller.signal,
          })
          if (account.status === 'error') {
            return { status: 'account_error' as const }
          }
          if (account.account.state !== 'signed_out') {
            return {
              status: 'already_connected' as const,
              account: account.account,
            }
          }
          nativeStartInvoked = true
          return runtime.startBrowserLogin({
            attemptId: currentAttempt.attemptId,
            expiresAt: currentAttempt.expiresAt,
            signal: controller.signal,
          })
        },
      })

      if (result.status === 'failed') {
        if (!nativeStartInvoked && attempt === currentAttempt) {
          attempt = undefined
        }
        projection = unavailableProjection()
        return cloneProjection(projection)
      }
      if (result.result.status === 'account_error') {
        if (attempt === currentAttempt) attempt = undefined
        projection = unavailableProjection()
        return cloneProjection(projection)
      }
      if (result.result.status === 'already_connected') {
        if (attempt === currentAttempt) attempt = undefined
        projection = projectFreshAccount(result.result.account)
        return cloneProjection(projection)
      }
      if (result.result.status === 'error') {
        if (attempt === currentAttempt) attempt = undefined
        projection = unavailableProjection()
        return cloneProjection(projection)
      }
      if (
        result.result.attemptId !== currentAttempt.attemptId ||
        result.result.expiresAt !== currentAttempt.expiresAt
      ) {
        projection = unavailableProjection()
        return cloneProjection(projection)
      }
      currentAttempt.authUrl = result.result.authUrl
      try {
        projection = loginPendingProjection(currentAttempt)
      } catch {
        projection = unavailableProjection()
      }
      return cloneProjection(projection)
    })()
    startFlight = flight
    void flight.finally(() => {
      controller.release()
      if (startFlight === flight) startFlight = undefined
    })
    return flight
  }

  const cancelAttempt = async (
    currentAttempt: LoginAttemptState,
    signal: AbortSignal,
  ): Promise<PublicPreviewAccountProjection> => {
    projection = verifyingProjection()
    const result = await options.coordinator.runAccountOperation({
      signal,
      operation: async () => {
        const runtime = await options.currentAccountRuntime({ signal })
        const cancellation = await runtime.cancelBrowserLogin({
          attemptId: currentAttempt.attemptId,
          signal,
        })
        if (
          cancellation.status === 'error' ||
          cancellation.attemptId !== currentAttempt.attemptId
        ) {
          return { status: 'protected' as const }
        }
        for (let index = 0; index < verificationAttempts; index += 1) {
          const status = await runtime.readBrowserLoginAttempt({
            attemptId: currentAttempt.attemptId,
            signal,
          })
          if (status.attemptId !== currentAttempt.attemptId) {
            return { status: 'protected' as const }
          }
          if (status.status !== 'pending') {
            currentAttempt.terminal = status
            return finalizeAttemptOnRuntime(
              runtime,
              currentAttempt,
              status,
              signal,
            )
          }
          if (index + 1 < verificationAttempts) {
            await options.wait(verificationIntervalMs, signal)
          }
        }
        return { status: 'protected' as const }
      },
    })
    if (result.status === 'failed' || result.result.status === 'protected') {
      projection = unavailableProjection()
      return cloneProjection(projection)
    }
    return applyFinalization(currentAttempt, result.result)
  }

  const retry = async (
    requestSignal: AbortSignal,
  ): Promise<PublicPreviewAccountProjection> => {
    requireAllowed(projection, 'account.retry')
    if (!attempt) return readFreshAccount(requestSignal)
    const currentAttempt = attempt
    if (attemptFlight) {
      await attemptFlight
      return cloneProjection(projection)
    }
    if (currentAttempt.terminal) {
      projection = verifyingProjection()
      const controller = ownOperation(ownedOperations)
      const flight = finalizeAttempt(
        currentAttempt,
        currentAttempt.terminal,
        controller.signal,
      )
      attemptFlight = flight
      try {
        return await flight
      } finally {
        controller.release()
        if (attemptFlight === flight) attemptFlight = undefined
      }
    }
    const observed = await inspectAttempt(currentAttempt, requestSignal)
    if (
      currentAttempt.terminal &&
      observed.state === 'verifying' &&
      attemptFlight
    ) {
      await attemptFlight
      return cloneProjection(projection)
    }
    return observed
  }

  return {
    async observe({ signal }) {
      if (shuttingDown) return cloneProjection(unavailableProjection())
      if (projection.state === 'checking') {
        if (accountReadFlight) return cloneProjection(projection)
        return readFreshAccount(signal)
      }
      if (startFlight || attemptFlight) return cloneProjection(projection)
      if (attempt) return inspectAttempt(attempt, signal)
      return cloneProjection(projection)
    },

    async dispatch({ command, signal }) {
      if (shuttingDown) return cloneProjection(unavailableProjection())
      switch (command.command) {
        case 'account.login.start':
          return startLogin(signal)
        case 'account.login.cancel': {
          if (
            !attempt ||
            command.attemptId !== attempt.attemptId ||
            (projection.state !== 'login_pending' && !attemptFlight)
          ) {
            throw new AccountRuntimeCommandError()
          }
          if (attemptFlight) {
            await attemptFlight
            return cloneProjection(projection)
          }
          const currentAttempt = attempt
          if (signal.aborted) {
            return cloneProjection(unavailableProjection())
          }
          const controller = ownOperation(ownedOperations)
          const flight = cancelAttempt(currentAttempt, controller.signal)
          attemptFlight = flight
          try {
            return await flight
          } finally {
            controller.release()
            if (attemptFlight === flight) attemptFlight = undefined
          }
        }
        case 'account.logout': {
          requireAllowed(projection, command.command)
          if (signal.aborted) {
            return cloneProjection(unavailableProjection())
          }
          const controller = ownOperation(ownedOperations)
          let result: Awaited<
            ReturnType<typeof options.coordinator.logout>
          >
          try {
            result = await options.coordinator.logout({
              signal: controller.signal,
            })
          } finally {
            controller.release()
          }
          projection =
            result.status === 'completed' &&
            result.result.state === 'signed_out'
              ? loginRequiredProjection()
              : unavailableProjection()
          return cloneProjection(projection)
        }
        case 'account.retry':
          return retry(signal)
      }
    },

    hasPendingAttempt() {
      return attempt !== undefined ||
        startFlight !== undefined ||
        attemptFlight !== undefined
    },

    beginShutdown() {
      if (shuttingDown) return
      shuttingDown = true
      for (const controller of ownedOperations) controller.abort()
    },
  }
}

function projectAccountRead(
  result: AccountRuntimeOperationResult<
    Awaited<ReturnType<CodexAccountLifecycle['readAccount']>>
  >,
): PublicPreviewAccountProjection {
  if (result.status === 'failed' || result.result.status === 'error') {
    return unavailableProjection()
  }
  return projectFreshAccount(result.result.account)
}

function projectFreshAccount(
  account: CodexFreshAccount,
  signedOutDisplayMessage?: string,
): PublicPreviewAccountProjection {
  switch (account.state) {
    case 'signed_out':
      return loginRequiredProjection(signedOutDisplayMessage)
    case 'chatgpt':
      return connectedProjection()
    case 'unsupported':
      return unsupportedProjection()
  }
}

function checkingProjection(): PublicPreviewAccountProjection {
  return decodePublicPreviewAccountProjection({
    state: 'checking',
    allowedCommands: [],
  })
}

function loginRequiredProjection(
  displayMessage = 'ChatGPT 연결이 필요합니다.',
): PublicPreviewAccountProjection {
  return decodePublicPreviewAccountProjection({
    state: 'login_required',
    displayMessage,
    allowedCommands: ['account.login.start', 'account.retry'],
  })
}

function loginStartingProjection(): PublicPreviewAccountProjection {
  return decodePublicPreviewAccountProjection({
    state: 'login_starting',
    displayMessage: '안전한 로그인 창을 준비하고 있습니다.',
    allowedCommands: [],
  })
}

function loginPendingProjection(
  attempt: LoginAttemptState,
): PublicPreviewAccountProjection {
  if (!attempt.authUrl) throw new Error('login_pending_without_auth_url')
  return decodePublicPreviewAccountProjection({
    state: 'login_pending',
    attemptId: attempt.attemptId,
    authUrl: attempt.authUrl,
    expiresAt: attempt.expiresAt,
    allowedCommands: ['account.login.cancel'],
  })
}

function verifyingProjection(): PublicPreviewAccountProjection {
  return decodePublicPreviewAccountProjection({
    state: 'verifying',
    displayMessage: '연결 결과를 확인하고 있습니다.',
    allowedCommands: [],
  })
}

function connectedProjection(): PublicPreviewAccountProjection {
  return decodePublicPreviewAccountProjection({
    state: 'connected',
    providerLabel: 'ChatGPT',
    allowedCommands: ['account.logout'],
  })
}

function unsupportedProjection(): PublicPreviewAccountProjection {
  return decodePublicPreviewAccountProjection({
    state: 'unsupported_account',
    displayMessage: '이 계정 유형은 현재 preview에서 지원하지 않습니다.',
    allowedCommands: ['account.logout'],
  })
}

function unavailableProjection(): PublicPreviewAccountProjection {
  return decodePublicPreviewAccountProjection({
    state: 'unavailable',
    displayMessage: '지금은 계정 상태를 확인할 수 없습니다.',
    allowedCommands: ['account.retry'],
  })
}

function signedOutMessage(terminal: TerminalLoginAttempt): string {
  switch (terminal.status) {
    case 'cancelled':
      return '로그인이 취소되었습니다. 준비되면 다시 연결해 주세요.'
    case 'expired':
      return '로그인 시간이 만료되었습니다. 다시 연결해 주세요.'
    case 'completed':
    case 'failed':
      return '로그인을 완료하지 못했습니다. 다시 연결해 주세요.'
  }
}

function cloneProjection(
  projection: PublicPreviewAccountProjection,
): PublicPreviewAccountProjection {
  return structuredClone(projection)
}

function requireAllowed(
  projection: PublicPreviewAccountProjection,
  command: AccountRuntimeCommand['command'],
): void {
  if (!projection.allowedCommands.includes(command as never)) {
    throw new AccountRuntimeCommandError()
  }
}

function ownOperation(controllers: Set<AbortController>): {
  readonly signal: AbortSignal
  release(): void
} {
  const controller = new AbortController()
  controllers.add(controller)
  return {
    signal: controller.signal,
    release() {
      controllers.delete(controller)
    },
  }
}
