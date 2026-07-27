import type {
  CodexChildEnvironment,
} from '@ay-ple/codex-chat-runtime'
import type {
  ProductWorkspaceLifecycle,
} from '@ay-ple/product-contract'
import type {
  SemesterWorkspaceStateV4,
} from '@ay-ple/semester-workspace'

import {
  resolvePreparedWorkspaceLaunch,
  type PreparedWorkspaceLaunchFailure,
  type PreparedWorkspaceLaunchSelection,
} from './prepared-workspace-launch.js'
import {
  createWorkspaceRegistryStore,
  type WorkspaceRegistryStore,
} from './workspace-registry.js'

const requiredInteractionServer = 'ay_ple_interaction'
const requiredInteractionTools = ['propose_state_patch'] as const

export type PreparedWorkspaceStartupStage =
  | 'prepared_root_validation'
  | 'shared_listener'
  | 'broker_generation'
  | 'workspace_runtime'
  | 'native_project_config'
  | 'adapter_handshake'
  | 'required_tool_roster'
  | 'thread_context'
  | 'registry_transaction'

export type PreparedWorkspaceSharedListener = {
  readonly port: number
  openActiveSurface(lifecycle: Extract<
    ProductWorkspaceLifecycle,
    { readonly state: 'active' }
  >): void
  close(): Promise<void>
}

export type PreparedWorkspaceBrokerGeneration = {
  readonly childEnvironment: CodexChildEnvironment
  runtimeTerminal(): Promise<void>
  adapterLost(): Promise<void>
  appShutdown(): Promise<void>
}

export type PreparedWorkspaceRuntimeGeneration = {
  readonly terminal: Promise<unknown>
  loadNativeProjectConfig(): Promise<void>
  startWorkspaceThread(): Promise<{ readonly threadId: string }>
  waitForRequiredMcp(input: {
    readonly serverName: string
    readonly expectedTools: readonly string[]
    readonly signal: AbortSignal
  }): Promise<void>
  confirmThreadContext(input: {
    readonly canonicalRoot: string
    readonly threadId: string
    readonly workspaceId: string
  }): Promise<void>
  close(): Promise<void>
}

export type PreparedWorkspaceStartupPorts = {
  bindSharedListener(): Promise<PreparedWorkspaceSharedListener>
  prepareBrokerGeneration(input: {
    readonly canonicalRoot: string
    readonly listenerPort: number
  }): Promise<PreparedWorkspaceBrokerGeneration>
  spawnWorkspaceRuntime(input: {
    readonly canonicalRoot: string
    readonly childEnvironment: CodexChildEnvironment
  }): Promise<PreparedWorkspaceRuntimeGeneration>
}

export type PreparedWorkspaceActiveSession = {
  readonly lifecycle: Extract<
    ProductWorkspaceLifecycle,
    { readonly state: 'active' }
  >
  adapterLost(): Promise<void>
  close(): Promise<void>
}

export class PreparedWorkspaceStartupError extends Error {
  readonly stage: PreparedWorkspaceStartupStage
  readonly launchFailure: PreparedWorkspaceLaunchFailure | undefined
  readonly lifecycle: Extract<
    ProductWorkspaceLifecycle,
    { readonly state: 'recovery_required' }
  > | undefined

  constructor(input: {
    readonly stage: PreparedWorkspaceStartupStage
    readonly cause?: unknown
    readonly launchFailure?: PreparedWorkspaceLaunchFailure
    readonly workspace?: SemesterWorkspaceStateV4
  }) {
    super('The prepared SemesterWorkspace could not be started.', {
      cause: input.cause,
    })
    this.name = 'PreparedWorkspaceStartupError'
    this.stage = input.stage
    this.launchFailure = input.launchFailure
    this.lifecycle = input.workspace
      ? {
          state: 'recovery_required',
          workspace: {
            availability: 'available',
            ...workspaceSummary(input.workspace),
          },
          reason: 'runtime_unavailable',
          displayMessage:
            'The workspace Runtime is unavailable. Restart AY-PLE after checking the prepared workspace.',
        }
      : launchFailureLifecycle(input.launchFailure)
  }
}

export async function startPreparedWorkspace(options: {
  readonly appDataRoot: string
  readonly explicitWorkspaceRoot?: string
  readonly ports: PreparedWorkspaceStartupPorts
  readonly registryStore?: WorkspaceRegistryStore
}): Promise<PreparedWorkspaceActiveSession> {
  const selection = await requirePreparedSelection(options)
  let stage: PreparedWorkspaceStartupStage = 'shared_listener'
  let listener: PreparedWorkspaceSharedListener | undefined
  let broker: PreparedWorkspaceBrokerGeneration | undefined
  let runtime: PreparedWorkspaceRuntimeGeneration | undefined
  let runtimeTerminated = false
  let cleanupPromise: Promise<void> | undefined

  const cleanup = (
    reason: 'runtime_terminal' | 'adapter_lost' | 'shutdown',
  ): Promise<void> => {
    cleanupPromise ??= (async () => {
      const failures: unknown[] = []
      for (const close of [
        () =>
          (reason === 'runtime_terminal'
            ? broker?.runtimeTerminal()
            : reason === 'adapter_lost'
              ? broker?.adapterLost()
              : broker?.appShutdown()) ?? Promise.resolve(),
        () => runtime?.close() ?? Promise.resolve(),
        () => listener?.close() ?? Promise.resolve(),
      ]) {
        try {
          await close()
        } catch (error) {
          failures.push(error)
        }
      }
      if (failures.length > 0) {
        throw new AggregateError(
          failures,
          'Prepared workspace startup cleanup failed',
        )
      }
    })()
    return cleanupPromise
  }

  try {
    listener = await options.ports.bindSharedListener()

    stage = 'broker_generation'
    broker = await options.ports.prepareBrokerGeneration({
      canonicalRoot: selection.canonicalRoot,
      listenerPort: listener.port,
    })

    stage = 'workspace_runtime'
    runtime = await options.ports.spawnWorkspaceRuntime({
      canonicalRoot: selection.canonicalRoot,
      childEnvironment: broker.childEnvironment,
    })
    void runtime.terminal.then(
      () => {
        runtimeTerminated = true
        void cleanup('runtime_terminal').catch(() => undefined)
      },
      () => {
        runtimeTerminated = true
        void cleanup('runtime_terminal').catch(() => undefined)
      },
    )

    stage = 'native_project_config'
    await raceRuntimeTerminal(runtime.loadNativeProjectConfig(), runtime)

    stage = 'adapter_handshake'
    const thread = await raceRuntimeTerminal(
      runtime.startWorkspaceThread(),
      runtime,
    )

    stage = 'required_tool_roster'
    await raceRuntimeTerminal(
      runtime.waitForRequiredMcp({
        serverName: requiredInteractionServer,
        expectedTools: requiredInteractionTools,
        signal: new AbortController().signal,
      }),
      runtime,
    )

    stage = 'thread_context'
    const fresh = await requireFreshSelection(
      selection,
      options.appDataRoot,
    )
    await raceRuntimeTerminal(
      runtime.confirmThreadContext({
        canonicalRoot: fresh.canonicalRoot,
        threadId: thread.threadId,
        workspaceId: fresh.workspace.workspaceId,
      }),
      runtime,
    )
    if (runtimeTerminated) throw new RuntimeTerminatedDuringStartup()

    stage = 'registry_transaction'
    await commitRegistryAuthority(
      options.registryStore ??
        createWorkspaceRegistryStore({
          appDataRoot: options.appDataRoot,
        }),
      selection,
    )
    if (runtimeTerminated) throw new RuntimeTerminatedDuringStartup()

    const lifecycle = {
      state: 'active',
      workspace: workspaceSummary(fresh.workspace),
    } satisfies Extract<
      ProductWorkspaceLifecycle,
      { readonly state: 'active' }
    >
    listener.openActiveSurface(lifecycle)

    return Object.freeze({
      lifecycle,
      adapterLost: () => cleanup('adapter_lost'),
      close: () => cleanup('shutdown'),
    })
  } catch (cause) {
    let failureCause = cause
    try {
      await cleanup('shutdown')
    } catch (cleanupCause) {
      failureCause = new AggregateError(
        [cause, cleanupCause],
        'Prepared workspace startup and cleanup failed',
      )
    }
    throw new PreparedWorkspaceStartupError({
      stage,
      cause: failureCause,
      workspace: selection.workspace,
    })
  }
}

async function requirePreparedSelection(options: {
  readonly appDataRoot: string
  readonly explicitWorkspaceRoot?: string
}): Promise<PreparedWorkspaceLaunchSelection> {
  const launch = await resolvePreparedWorkspaceLaunch({
    appDataRoot: options.appDataRoot,
    ...(options.explicitWorkspaceRoot === undefined
      ? {}
      : { explicitWorkspaceRoot: options.explicitWorkspaceRoot }),
  })
  if (launch.status === 'selected') return launch
  throw new PreparedWorkspaceStartupError({
    stage: 'prepared_root_validation',
    launchFailure: launch,
  })
}

async function requireFreshSelection(
  expected: PreparedWorkspaceLaunchSelection,
  appDataRoot: string,
): Promise<PreparedWorkspaceLaunchSelection> {
  const fresh = await resolvePreparedWorkspaceLaunch({
    appDataRoot,
    explicitWorkspaceRoot: expected.canonicalRoot,
  })
  if (
    fresh.status !== 'selected' ||
    fresh.canonicalRoot !== expected.canonicalRoot ||
    fresh.workspace.workspaceId !== expected.workspace.workspaceId
  ) {
    throw new TypeError('Prepared workspace identity changed during startup')
  }
  return fresh
}

async function commitRegistryAuthority(
  store: WorkspaceRegistryStore,
  selection: PreparedWorkspaceLaunchSelection,
): Promise<void> {
  if (selection.source === 'registry') {
    const reopened = await store.resolveActiveWorkspace()
    if (
      reopened.status !== 'available' ||
      reopened.canonicalRoot !== selection.canonicalRoot ||
      reopened.workspace.workspaceId !== selection.workspace.workspaceId
    ) {
      throw new TypeError('Registered workspace authority changed during startup')
    }
    return
  }

  const observed = await store.read()
  if (observed.status === 'incompatible') {
    throw new TypeError('Workspace registry is incompatible')
  }
  const committed = await store.commitActiveWorkspace({
    expectedAuthority: observed.authority,
    canonicalRoot: selection.canonicalRoot,
  })
  if (committed.status !== 'written') {
    throw new TypeError('Workspace registry transaction failed')
  }
}

async function raceRuntimeTerminal<T>(
  operation: Promise<T>,
  runtime: PreparedWorkspaceRuntimeGeneration,
): Promise<T> {
  return Promise.race([
    operation,
    runtime.terminal.then<never>(
      () => {
        throw new RuntimeTerminatedDuringStartup()
      },
      () => {
        throw new RuntimeTerminatedDuringStartup()
      },
    ),
  ])
}

function workspaceSummary(
  workspace: SemesterWorkspaceStateV4,
): Extract<
  ProductWorkspaceLifecycle,
  { readonly state: 'active' }
>['workspace'] {
  return {
    workspaceId: workspace.workspaceId,
    semester: {
      yearLevel: workspace.semester.yearLevel,
      term: { ...workspace.semester.term },
    },
    label: safeWorkspaceLabel(workspace),
  }
}

function safeWorkspaceLabel(
  workspace: SemesterWorkspaceStateV4,
): string {
  const displayName = workspace.semester.term.displayName
    .replace(/[\p{Cc}/\\]/gu, ' ')
    .trim()
  return `${workspace.semester.yearLevel}학년 ${
    displayName || workspace.semester.term.key
  }`
}

function launchFailureLifecycle(
  failure: PreparedWorkspaceLaunchFailure | undefined,
): Extract<
  ProductWorkspaceLifecycle,
  { readonly state: 'recovery_required' }
> | undefined {
  if (failure?.code === 'prepared_workspace_required') {
    return {
      state: 'recovery_required',
      workspace: null,
      reason: 'prepared_workspace_required',
      displayMessage:
        'Prepare a SemesterWorkspace before starting AY-PLE.',
    }
  }
  if (failure?.code === 'registry_incompatible') {
    return {
      state: 'recovery_required',
      workspace: null,
      reason: 'registry_incompatible',
      displayMessage:
        'The workspace registry is incompatible and was preserved.',
    }
  }
  return undefined
}

class RuntimeTerminatedDuringStartup extends Error {}
