import {
  decodePublicPreviewAccountProjection,
  decodePublicPreviewBootstrap,
  decodePublicPreviewResponse,
  decodePublicPreviewSetupProjection,
  type PublicPreviewAccountProjection,
  type PublicPreviewBootstrap,
  type PublicPreviewCommand,
  type PublicPreviewCommandName,
  type PublicPreviewErrorCode,
  type PublicPreviewResponse,
  type PublicPreviewSetupProjection,
} from '@ay-ple/product-contract'
import type {
  AdmittedSemesterWorkspace,
  SemesterSetupJourneyProjection,
  SetupJourney,
  SetupReconcileOutcome,
} from '@ay-ple/semester-workspace'

import {
  AccountRuntimeCommandError,
  type AccountRuntimeCommand,
  type AccountRuntimeRouteAdapter,
} from './account-runtime/route-adapter.js'
import type {
  PublicPreviewParentSelectionPort,
} from './public-preview-parent-selection.js'
import {
  toPublicPreviewSetupProjection,
  type SetupJourneyProjectionContext,
} from './setup/setup-journey-projection.js'

export interface PublicPreviewCommandAdapter {
  observe(input: {
    readonly signal: AbortSignal
  }): Promise<PublicPreviewResponse>
  dispatch(input: {
    readonly command: PublicPreviewCommand
    readonly signal: AbortSignal
  }): Promise<PublicPreviewResponse>
  failure(input: {
    readonly code: PublicPreviewErrorCode
    readonly signal: AbortSignal
  }): Promise<PublicPreviewResponse>
  currentReadyWorkspace(): AdmittedSemesterWorkspace | null
  beginShutdown(): void
  whenIdle(): Promise<void>
}

export function createPublicPreviewCommandAdapter(input: {
  readonly account: AccountRuntimeRouteAdapter
  readonly journey: SetupJourney<SemesterSetupJourneyProjection>
  readonly parentSelection: PublicPreviewParentSelectionPort
  readonly projectionContext: Omit<
    SetupJourneyProjectionContext,
    'accountConnected' | 'parentSelection'
  >
}): PublicPreviewCommandAdapter {
  const activeCommands = new Set<Promise<unknown>>()
  let forceInputProjection = false
  let shuttingDown = false

  const project = (
    account: PublicPreviewAccountProjection,
  ): PublicPreviewBootstrap => {
    const privateProjection = forceInputProjection
      ? { state: 'input_required' as const }
      : input.journey.observe()
    let setup = toPublicPreviewSetupProjection(privateProjection, {
      ...input.projectionContext,
      accountConnected: account.state === 'connected',
      parentSelection:
        input.parentSelection.current()?.presentation ?? null,
    })
    if (
      account.state !== 'connected' &&
      (privateProjection.state === 'input_required' ||
        privateProjection.state === 'confirmation_required')
    ) {
      setup = firstConnectionProjection()
    }
    return decodePublicPreviewBootstrap({ account, setup })
  }

  const snapshot = async (
    signal: AbortSignal,
    accountOverride?: PublicPreviewAccountProjection,
  ): Promise<PublicPreviewBootstrap> => {
    let account: PublicPreviewAccountProjection
    try {
      account =
        accountOverride ?? await input.account.observe({ signal })
    } catch {
      return safeUnavailableBootstrap()
    }
    try {
      return project(account)
    } catch {
      return decodePublicPreviewBootstrap({
        account,
        setup: safeUnavailableSetup(account),
      })
    }
  }

  const runCommand = (
    operation: () => Promise<PublicPreviewResponse>,
  ): Promise<PublicPreviewResponse> => {
    const promise = operation()
    activeCommands.add(promise)
    void promise.then(
      () => activeCommands.delete(promise),
      () => activeCommands.delete(promise),
    )
    return promise
  }

  const dispatch = async (
    command: PublicPreviewCommand,
    signal: AbortSignal,
  ): Promise<PublicPreviewResponse> => {
    if (shuttingDown) {
      return errorResponse(
        'setup_unavailable',
        await snapshot(signal),
      )
    }
    const before = await snapshot(signal)
    if (
      !isAllowed(before, command.command) ||
      !matchesOpaqueAuthority(before, command)
    ) {
      return errorResponse('command_not_allowed', before)
    }
    try {
      if (isAccountCommand(command)) {
        const account = await input.account.dispatch({ command, signal })
        return accountCommandResponse(
          command,
          account,
          await snapshot(signal, account),
        )
      }
      switch (command.command) {
        case 'workspace.parent.select': {
          const previous =
            input.parentSelection.current()?.authority.selectionId
          const selected = await input.parentSelection.select({ signal })
          if (
            selected &&
            selected.authority.selectionId !== previous &&
            input.journey.observe().state === 'confirmation_required'
          ) {
            forceInputProjection = true
          }
          return okResponse(await snapshot(signal))
        }
        case 'setup.prepare': {
          const parent = input.parentSelection.current()
          if (
            !parent ||
            parent.authority.selectionId !==
              command.input.parentSelectionId
          ) {
            return errorResponse('setup_invalid_input', before)
          }
          forceInputProjection = false
          const result = await input.journey.reconcile({
            kind: 'prepare',
            input: {
              yearLevel: command.input.yearLevel,
              term: {
                key: command.input.term,
                displayName: termDisplayName(command.input.term),
              },
              parentSelectionId: command.input.parentSelectionId,
              leafName: command.input.leafName,
            },
          })
          return setupResultResponse(
            result.outcome,
            await snapshot(signal),
          )
        }
        case 'setup.approve': {
          forceInputProjection = false
          const result = await input.journey.reconcile({
            kind: 'approve',
            setupPlanId: command.setupPlanId,
          })
          const account =
            result.outcome === 'reauth_required'
              ? await input.account.refresh({ signal })
              : undefined
          return setupResultResponse(
            result.outcome,
            await snapshot(signal, account),
          )
        }
        case 'setup.resume':
        case 'setup.recover.resume':
        case 'setup.recover.discard': {
          forceInputProjection = false
          const result = await input.journey.reconcile({
            kind: 'recover',
            recoveryId: command.recoveryId,
            action:
              command.command === 'setup.recover.discard'
                ? 'discard'
                : 'resume',
          })
          const account =
            result.outcome === 'reauth_required'
              ? await input.account.refresh({ signal })
              : undefined
          return setupResultResponse(
            result.outcome,
            await snapshot(signal, account),
          )
        }
        case 'setup.recover.manual_guidance':
          return okResponse(await snapshot(signal))
      }
    } catch (error) {
      const projection = await snapshot(signal)
      return error instanceof AccountRuntimeCommandError
        ? errorResponse('command_not_allowed', projection)
        : errorResponse(
            isAccountCommand(command)
              ? 'account_unavailable'
              : 'setup_unavailable',
            projection,
          )
    }
  }

  return {
    async observe({ signal }) {
      return okResponse(await snapshot(signal))
    },
    dispatch: ({ command, signal }) =>
      runCommand(() => dispatch(command, signal)),
    async failure({ code, signal }) {
      return errorResponse(code, await snapshot(signal))
    },
    currentReadyWorkspace() {
      const projection = input.journey.observe()
      if (
        projection.state !== 'ready' ||
        !input.projectionContext.readyAttested(projection.workspace)
      ) {
        return null
      }
      return structuredClone(projection.workspace)
    },
    beginShutdown() {
      if (shuttingDown) return
      shuttingDown = true
      input.parentSelection.beginShutdown()
      input.account.beginShutdown()
    },
    async whenIdle() {
      while (activeCommands.size > 0) {
        await Promise.allSettled([...activeCommands])
      }
    },
  }
}

function isAccountCommand(
  command: PublicPreviewCommand,
): command is AccountRuntimeCommand {
  return command.command.startsWith('account.')
}

function isAllowed(
  bootstrap: PublicPreviewBootstrap,
  command: PublicPreviewCommandName,
): boolean {
  return (
    (bootstrap.account.allowedCommands as readonly string[]).includes(
      command,
    ) ||
    (bootstrap.setup.allowedCommands as readonly string[]).includes(command)
  )
}

function matchesOpaqueAuthority(
  bootstrap: PublicPreviewBootstrap,
  command: PublicPreviewCommand,
): boolean {
  switch (command.command) {
    case 'account.login.cancel':
      return bootstrap.account.state === 'login_pending' &&
        bootstrap.account.attemptId === command.attemptId
    case 'setup.approve':
      return bootstrap.setup.state === 'confirmation_required' &&
        bootstrap.setup.setupPlanId === command.setupPlanId
    case 'setup.resume':
      return (
        (bootstrap.setup.state === 'account_required' &&
          bootstrap.setup.reason === 'workspace_reauth' &&
          bootstrap.setup.recoveryId === command.recoveryId) ||
        (bootstrap.setup.state === 'transition_blocked' &&
          bootstrap.setup.retry === 'resume' &&
          bootstrap.setup.recoveryId === command.recoveryId)
      )
    case 'setup.recover.resume':
    case 'setup.recover.discard':
    case 'setup.recover.manual_guidance':
      return bootstrap.setup.state === 'recovery_required' &&
        bootstrap.setup.recoveryId === command.recoveryId
    default:
      return true
  }
}

function termDisplayName(term: string): string {
  if (term === '1') return '1학기'
  if (term === '2') return '2학기'
  if (term === 'summer') return '여름 계절학기'
  if (term === 'winter') return '겨울 계절학기'
  return term.trim()
}

function accountCommandResponse(
  command: AccountRuntimeCommand,
  account: PublicPreviewAccountProjection,
  bootstrap: PublicPreviewBootstrap,
): PublicPreviewResponse {
  if (account.state === 'unavailable') {
    return errorResponse('account_unavailable', bootstrap)
  }
  if (account.state === 'unsupported_account') {
    return errorResponse('account_unsupported', bootstrap)
  }
  if (
    command.command === 'account.login.start' &&
    account.state === 'login_required'
  ) {
    return errorResponse('account_login_failed', bootstrap)
  }
  return okResponse(bootstrap)
}

function setupResultResponse(
  outcome: SetupReconcileOutcome,
  bootstrap: PublicPreviewBootstrap,
): PublicPreviewResponse {
  switch (outcome) {
    case 'setup_conflict':
    case 'setup_state_conflict':
      return errorResponse('setup_conflict', bootstrap)
    case 'setup_release_mismatch':
      return errorResponse('setup_release_mismatch', bootstrap)
    case 'account_unavailable':
      return errorResponse('account_unavailable', bootstrap)
    case 'cancelled':
      return errorResponse('setup_unavailable', bootstrap)
    default:
      return okResponse(bootstrap)
  }
}

function firstConnectionProjection(): PublicPreviewSetupProjection {
  return decodePublicPreviewSetupProjection({
    state: 'account_required',
    reason: 'first_connection',
    displayMessage:
      '학기 공간을 만들기 전에 ChatGPT를 연결해 주세요.',
    allowedCommands: [],
  })
}

function safeUnavailableBootstrap(): PublicPreviewBootstrap {
  return decodePublicPreviewBootstrap({
    account: decodePublicPreviewAccountProjection({
      state: 'unavailable',
      displayMessage: '지금은 계정 상태를 확인할 수 없습니다.',
      allowedCommands: ['account.retry'],
    }),
    setup: firstConnectionProjection(),
  })
}

function safeUnavailableSetup(
  account: PublicPreviewAccountProjection,
): PublicPreviewSetupProjection {
  return account.state === 'connected'
    ? decodePublicPreviewSetupProjection({
        state: 'transition_blocked',
        reason: 'setup_transition_unavailable',
        retry: 'restart_required',
        displayMessage:
          'AY-PLE을 종료한 뒤 같은 명령으로 다시 실행해 주세요.',
        allowedCommands: [],
      })
    : firstConnectionProjection()
}

function okResponse(
  projection: PublicPreviewBootstrap,
): PublicPreviewResponse {
  return decodePublicPreviewResponse({ status: 'ok', projection })
}

function errorResponse(
  code: PublicPreviewErrorCode,
  projection: PublicPreviewBootstrap,
): PublicPreviewResponse {
  const presentation = errorPresentations[code]
  return decodePublicPreviewResponse({
    status: 'error',
    error: {
      code,
      displayMessage: presentation.displayMessage,
      retryable: presentation.retryable,
    },
    projection,
  })
}

const errorPresentations: Readonly<
  Record<
    PublicPreviewErrorCode,
    { readonly displayMessage: string; readonly retryable: boolean }
  >
> = {
  account_login_failed: {
    displayMessage:
      'ChatGPT 연결을 완료하지 못했습니다. 다시 시도해 주세요.',
    retryable: true,
  },
  account_unavailable: {
    displayMessage:
      '지금은 Codex 계정 상태를 확인할 수 없습니다.',
    retryable: true,
  },
  account_unsupported: {
    displayMessage:
      '이 계정 유형은 현재 preview에서 지원하지 않습니다.',
    retryable: false,
  },
  command_not_allowed: {
    displayMessage:
      '현재 단계에서는 이 작업을 진행할 수 없습니다.',
    retryable: false,
  },
  setup_conflict: {
    displayMessage:
      '다른 탭에서 변경된 현재 상태를 다시 확인해 주세요.',
    retryable: true,
  },
  setup_invalid_input: {
    displayMessage: '학기 공간 설정값을 다시 확인해 주세요.',
    retryable: false,
  },
  setup_release_mismatch: {
    displayMessage:
      '현재 AY-PLE 버전에서는 이 준비 작업을 이어갈 수 없습니다.',
    retryable: false,
  },
  setup_unavailable: {
    displayMessage:
      '학기 공간 준비 상태를 확인할 수 없습니다.',
    retryable: true,
  },
}
