import type { CodexFreshAccount } from '@ay-ple/codex-chat-runtime'

import type {
  AccountRuntimeCoordinator,
  AccountRuntimeCoordinatorCloseResult,
  AccountRuntimeCoordinatorDependencies,
  AccountRuntimeLeaseFailure,
  AccountRuntimeOperationResult,
} from './contract.js'

type RuntimeCloseResult = {
  readonly status: 'closed'
  readonly processTreeGone: true
} | {
  readonly status: 'ambiguous'
  readonly processTreeGone: false
}

export type CreateAccountRuntimeCoordinatorOptions<
  TAccount extends CodexFreshAccount,
  TAdmittedWorkspace,
> = AccountRuntimeCoordinatorDependencies<TAccount, TAdmittedWorkspace> & {
  readonly logoutAndReadFreshAccount: (input: {
    readonly signal: AbortSignal
  }) => Promise<TAccount>
  readonly closeCurrentRuntime: (input: {
    readonly signal: AbortSignal
  }) => Promise<RuntimeCloseResult>
  readonly hasPendingAccountAttempt?: () => boolean
  readonly onAuthRuntimeCloseRejected?: (cause: unknown) => void
  readonly sameWorkspace?: (
    left: TAdmittedWorkspace,
    right: TAdmittedWorkspace,
  ) => boolean
}

type LeaseWaiter = {
  readonly signal: AbortSignal
  readonly settle: (release: (() => void) | undefined) => void
  readonly onAbort: () => void
}

type RuntimePhase<TAdmittedWorkspace> =
  | { readonly state: 'auth-only' }
  | { readonly state: 'auth-closed' }
  | {
      readonly state: 'workspace'
      readonly workspace: TAdmittedWorkspace
    }
  | {
      readonly state: 'restart-required'
      readonly failure: AccountRuntimeLeaseFailure
    }
  | { readonly state: 'closed' }

export function createAccountRuntimeCoordinator<
  TAccount extends CodexFreshAccount,
  TAdmittedWorkspace,
  TReady,
>(
  options: CreateAccountRuntimeCoordinatorOptions<
    TAccount,
    TAdmittedWorkspace
  >,
): AccountRuntimeCoordinator<TAccount, TAdmittedWorkspace, TReady> {
  const lease = new SerialAccountRuntimeLease()
  let phase: RuntimePhase<TAdmittedWorkspace> = { state: 'auth-only' }
  let closePromise: Promise<AccountRuntimeCoordinatorCloseResult> | undefined

  const blockedFailure = (): AccountRuntimeLeaseFailure | undefined => {
    if (phase.state === 'closed') return failure('coordinator_closed')
    if (phase.state === 'restart-required') return phase.failure
    return undefined
  }

  const runAccountOperation = async <TResult>(input: {
    readonly signal: AbortSignal
    readonly operation: () => Promise<TResult>
  }): Promise<AccountRuntimeOperationResult<TResult>> => {
    const blocked = blockedFailure()
    if (blocked) return { status: 'failed', error: blocked }
    const release = await lease.acquire(input.signal)
    if (!release) {
      return {
        status: 'failed',
        error: input.signal.aborted
          ? failure('transition_cancelled')
          : failure('coordinator_closed'),
      }
    }
    try {
      const currentBlock = blockedFailure()
      if (currentBlock) return { status: 'failed', error: currentBlock }
      return {
        status: 'completed',
        result: await input.operation(),
      }
    } catch {
      return {
        status: 'failed',
        error: failure('account_unavailable'),
      }
    } finally {
      release()
    }
  }

  return {
    runAccountOperation,

    async transitionToWorkspace(input) {
      const blocked = blockedFailure()
      if (blocked) return { status: 'failed', error: blocked }
      const release = await lease.acquire(input.signal)
      if (!release) {
        return {
          status: 'failed',
          error: input.signal.aborted
            ? failure('transition_cancelled')
            : failure('coordinator_closed'),
        }
      }
      try {
        const currentBlock = blockedFailure()
        if (currentBlock) return { status: 'failed', error: currentBlock }
        if (options.hasPendingAccountAttempt?.()) {
          return {
            status: 'failed',
            error: failure('account_operation_active'),
          }
        }
        if (input.signal.aborted) {
          return {
            status: 'failed',
            error: failure('transition_cancelled'),
          }
        }

        if (phase.state === 'auth-only') {
          let closed: RuntimeCloseResult
          try {
            closed = await options.closeAuthOnlyRuntime({
              signal: input.signal,
            })
          } catch (cause) {
            reportAuthRuntimeCloseRejection(options, cause)
            const error = failure('auth_runtime_close_ambiguous')
            phase = { state: 'restart-required', failure: error }
            return { status: 'failed', error }
          }
          if (closed.status !== 'closed' || !closed.processTreeGone) {
            const error = failure('auth_runtime_close_ambiguous')
            phase = { state: 'restart-required', failure: error }
            return { status: 'failed', error }
          }
          phase = { state: 'auth-closed' }
        }

        if (input.signal.aborted) {
          return {
            status: 'failed',
            error: failure('transition_cancelled'),
          }
        }

        if (phase.state === 'auth-closed') {
          try {
            await options.startWorkspaceRuntime({
              workspace: input.workspace,
              signal: input.signal,
            })
          } catch {
            const error = failure('workspace_runtime_start_failed')
            phase = { state: 'restart-required', failure: error }
            return { status: 'failed', error }
          }
          phase = { state: 'workspace', workspace: input.workspace }
        } else if (
          phase.state === 'workspace' &&
          !(options.sameWorkspace ?? Object.is)(
            phase.workspace,
            input.workspace,
          )
        ) {
          const error = failure('workspace_runtime_start_failed')
          phase = { state: 'restart-required', failure: error }
          return { status: 'failed', error }
        }

        let account: TAccount
        try {
          account = await options.readFreshWorkspaceAccount({
            signal: input.signal,
          })
        } catch {
          return {
            status: 'failed',
            error: input.signal.aborted
              ? failure('transition_cancelled')
              : failure('account_unavailable'),
          }
        }
        if (account.state === 'signed_out') {
          return {
            status: 'failed',
            error: failure('workspace_account_reauth_required'),
          }
        }
        if (!isFreshChatGptAccount(account)) {
          return {
            status: 'failed',
            error: failure('account_unavailable'),
          }
        }

        try {
          await input.commitReady({
            workspace: input.workspace,
            account,
          })
          const ready = await input.readReady()
          return { status: 'ready', ready }
        } catch {
          return {
            status: 'failed',
            error: failure('account_unavailable'),
          }
        }
      } finally {
        release()
      }
    },

    async logout(input) {
      return runAccountOperation({
        signal: input.signal,
        operation: () =>
          options.logoutAndReadFreshAccount({ signal: input.signal }),
      })
    },

    close(input) {
      if (closePromise) return closePromise
      lease.beginClose()
      closePromise = (async () => {
        await lease.whenIdle()
        const result = await options
          .closeCurrentRuntime({ signal: input.signal })
          .catch(() => ({
            status: 'ambiguous' as const,
            processTreeGone: false as const,
          }))
        phase = { state: 'closed' }
        return result
      })()
      return closePromise
    },
  }
}

function isFreshChatGptAccount<TAccount extends CodexFreshAccount>(
  account: TAccount,
): account is Extract<TAccount, { readonly state: 'chatgpt' }> {
  return account.state === 'chatgpt'
}

function reportAuthRuntimeCloseRejection<
  TAccount extends CodexFreshAccount,
  TAdmittedWorkspace,
>(
  options: CreateAccountRuntimeCoordinatorOptions<
    TAccount,
    TAdmittedWorkspace
  >,
  cause: unknown,
): void {
  try {
    options.onAuthRuntimeCloseRejected?.(cause)
  } catch {
    // Diagnostic reporting cannot weaken the restart-required latch.
  }
}

class SerialAccountRuntimeLease {
  private readonly waiters: LeaseWaiter[] = []
  private readonly idleWaiters = new Set<() => void>()
  private active = false
  private closing = false

  acquire(signal: AbortSignal): Promise<(() => void) | undefined> {
    if (this.closing || signal.aborted) return Promise.resolve(undefined)
    return new Promise((settle) => {
      const waiter: LeaseWaiter = {
        signal,
        settle,
        onAbort: () => {
          const index = this.waiters.indexOf(waiter)
          if (index < 0) return
          this.waiters.splice(index, 1)
          signal.removeEventListener('abort', waiter.onAbort)
          settle(undefined)
          this.settleIdle()
        },
      }
      signal.addEventListener('abort', waiter.onAbort, { once: true })
      if (signal.aborted) {
        waiter.onAbort()
        return
      }
      this.waiters.push(waiter)
      this.drain()
    })
  }

  beginClose(): void {
    if (this.closing) return
    this.closing = true
    for (const waiter of this.waiters.splice(0)) {
      waiter.signal.removeEventListener('abort', waiter.onAbort)
      waiter.settle(undefined)
    }
    this.settleIdle()
  }

  whenIdle(): Promise<void> {
    if (!this.active && this.waiters.length === 0) return Promise.resolve()
    return new Promise((resolve) => {
      this.idleWaiters.add(resolve)
    })
  }

  private drain(): void {
    if (this.active || this.closing) return
    const waiter = this.waiters.shift()
    if (!waiter) {
      this.settleIdle()
      return
    }
    waiter.signal.removeEventListener('abort', waiter.onAbort)
    if (waiter.signal.aborted) {
      waiter.settle(undefined)
      this.drain()
      return
    }
    this.active = true
    let released = false
    waiter.settle(() => {
      if (released) return
      released = true
      this.active = false
      this.drain()
      this.settleIdle()
    })
  }

  private settleIdle(): void {
    if (this.active || this.waiters.length > 0) return
    for (const settle of this.idleWaiters) settle()
    this.idleWaiters.clear()
  }
}

function failure(
  code: AccountRuntimeLeaseFailure['code'],
): AccountRuntimeLeaseFailure {
  switch (code) {
    case 'account_operation_active':
      return { code, retryable: true, restartRequired: false }
    case 'account_unavailable':
      return { code, retryable: true, restartRequired: false }
    case 'workspace_account_reauth_required':
      return { code, retryable: true, restartRequired: false }
    case 'transition_cancelled':
      return { code, retryable: true, restartRequired: false }
    case 'auth_runtime_close_ambiguous':
    case 'workspace_runtime_start_failed':
      return { code, retryable: false, restartRequired: true }
    case 'coordinator_closed':
      return { code, retryable: false, restartRequired: false }
  }
}
