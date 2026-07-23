export type AccountRuntimeLeaseFailureCode =
  | 'account_operation_active'
  | 'account_unavailable'
  | 'auth_runtime_close_ambiguous'
  | 'coordinator_closed'
  | 'transition_cancelled'
  | 'workspace_runtime_start_failed'

export type AccountRuntimeLeaseFailure = {
  readonly code: AccountRuntimeLeaseFailureCode
  readonly retryable: boolean
  readonly restartRequired: boolean
}

export type AccountRuntimeOperationResult<TResult> =
  | {
      readonly status: 'completed'
      readonly result: TResult
    }
  | {
      readonly status: 'failed'
      readonly error: AccountRuntimeLeaseFailure
    }

export type WorkspaceRuntimeTransitionResult<TReady> =
  | {
      readonly status: 'ready'
      readonly ready: TReady
    }
  | {
      readonly status: 'failed'
      readonly error: AccountRuntimeLeaseFailure
    }

export interface AccountRuntimeTransitionLease<
  TAccount,
  TAdmittedWorkspace,
  TReady,
> {
  runAccountOperation<TResult>(input: {
    readonly signal: AbortSignal
    readonly operation: () => Promise<TResult>
  }): Promise<AccountRuntimeOperationResult<TResult>>
  transitionToWorkspace(input: {
    readonly workspace: TAdmittedWorkspace
    readonly signal: AbortSignal
    readonly commitReady: (input: {
      readonly workspace: TAdmittedWorkspace
      readonly account: TAccount
    }) => Promise<TReady>
    readonly readReady: () => Promise<TReady>
  }): Promise<WorkspaceRuntimeTransitionResult<TReady>>
}

export type AccountRuntimeCoordinatorCloseResult =
  | {
      readonly status: 'closed'
      readonly processTreeGone: true
    }
  | {
      readonly status: 'ambiguous'
      readonly processTreeGone: false
    }

export interface AccountRuntimeCoordinator<
  TAccount,
  TAdmittedWorkspace,
  TReady,
> extends AccountRuntimeTransitionLease<
    TAccount,
    TAdmittedWorkspace,
    TReady
  > {
  logout(input: {
    readonly signal: AbortSignal
  }): Promise<AccountRuntimeOperationResult<TAccount>>
  close(input: {
    readonly signal: AbortSignal
  }): Promise<AccountRuntimeCoordinatorCloseResult>
}

export type AccountRuntimeCoordinatorDependencies<
  TAccount,
  TAdmittedWorkspace,
> = {
  readonly closeAuthOnlyRuntime: (input: {
    readonly signal: AbortSignal
  }) => Promise<
    | { readonly status: 'closed'; readonly processTreeGone: true }
    | { readonly status: 'ambiguous'; readonly processTreeGone: false }
  >
  readonly startWorkspaceRuntime: (input: {
    readonly workspace: TAdmittedWorkspace
    readonly signal: AbortSignal
  }) => Promise<void>
  readonly readFreshWorkspaceAccount: (input: {
    readonly signal: AbortSignal
  }) => Promise<TAccount>
}
