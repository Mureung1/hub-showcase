import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type {
  CodexChildEnvironment,
  CodexEffectiveConfig,
} from '@ay-ple/codex-chat-runtime'
import type { ProductWorkspaceLifecycle } from '@ay-ple/product-contract'
import type { SemesterWorkspaceStateV4 } from '@ay-ple/semester-workspace'

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
const requiredInteractionEnvironment = [
  'AY_PLE_INTERACTION_BROKER_URL',
  'AY_PLE_INTERACTION_BROKER_TOKEN',
  'AY_PLE_INTERACTION_RUNTIME_BINDING',
] as const
const interactionAdapterPath = fileURLToPath(
  new URL('../../../packages/interaction-mcp/dist/stdio.js', import.meta.url),
)
const defaultCleanupDeadlineMs = 5_000

export type PreparedWorkspaceStartupStage =
  | 'prepared_root_validation'
  | 'shared_listener'
  | 'broker_generation'
  | 'workspace_runtime'
  | 'native_project_config'
  | 'adapter_handshake'
  | 'adapter_lifecycle'
  | 'thread_context'
  | 'product_thread_handoff'
  | 'registry_transaction'

type PreparedWorkspaceActiveLifecycle = Extract<
  ProductWorkspaceLifecycle,
  { readonly state: 'active' }
>

type PreparedWorkspaceRecoveryLifecycle = Extract<
  ProductWorkspaceLifecycle,
  { readonly state: 'recovery_required' }
>

export type PreparedWorkspaceSharedListener = {
  readonly port: number
  close(): Promise<void>
}

export type PreparedWorkspaceBrokerGeneration = {
  readonly childEnvironment: CodexChildEnvironment
  readonly adapterStatus: {
    readonly ready: Promise<void>
    readonly lost: Promise<void>
    isLost(): boolean
  }
  runtimeTerminal(): Promise<void>
  adapterLost(): Promise<void>
  appShutdown(): Promise<void>
}

export type PreparedWorkspaceRuntimeGeneration = {
  readonly terminal: Promise<unknown>
  loadNativeProjectConfig(): Promise<CodexEffectiveConfig>
  startWorkspaceThread(): Promise<{ readonly threadId: string }>
  confirmThreadContext(input: {
    readonly canonicalRoot: string
    readonly threadId: string
    readonly workspaceId: string
  }): Promise<void>
  handoffProductThread(threadId: string): Promise<void>
  close(): Promise<void>
}

export type PreparedWorkspaceStartupPorts = {
  bindSharedListener(input: {
    readonly readLifecycle: () => ProductWorkspaceLifecycle
  }): Promise<PreparedWorkspaceSharedListener>
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
  readonly lifecycle: PreparedWorkspaceActiveLifecycle
  readLifecycle(): ProductWorkspaceLifecycle
  close(): Promise<void>
}

export class PreparedWorkspaceStartupError extends Error {
  readonly stage: PreparedWorkspaceStartupStage
  readonly launchFailure: PreparedWorkspaceLaunchFailure | undefined
  readonly lifecycle: PreparedWorkspaceRecoveryLifecycle | undefined

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
      ? runtimeUnavailableLifecycle(input.workspace)
      : launchFailureLifecycle(input.launchFailure)
  }
}

export async function startPreparedWorkspace(options: {
  readonly appDataRoot: string
  readonly explicitWorkspaceRoot?: string
  readonly ports: PreparedWorkspaceStartupPorts
  readonly registryStore?: WorkspaceRegistryStore
  /** Test-only operational override. Production uses the five-second bound. */
  readonly cleanupDeadlineMs?: number
}): Promise<PreparedWorkspaceActiveSession> {
  const cleanupDeadlineMs = requireCleanupDeadline(
    options.cleanupDeadlineMs ?? defaultCleanupDeadlineMs,
  )
  const selection = await requirePreparedSelection(options)
  let stage: PreparedWorkspaceStartupStage = 'shared_listener'
  let listener: PreparedWorkspaceSharedListener | undefined
  let broker: PreparedWorkspaceBrokerGeneration | undefined
  let runtime: PreparedWorkspaceRuntimeGeneration | undefined
  let lifecycle: ProductWorkspaceLifecycle = {
    state: 'starting',
    workspace: workspaceSummary(selection.workspace),
  }
  let generationUnavailable = false
  let cleanupPromise: Promise<void> | undefined

  const cleanup = (
    reason: 'runtime_terminal' | 'adapter_lost' | 'shutdown',
  ): Promise<void> => {
    cleanupPromise ??= (async () => {
      const failures: unknown[] = []
      const deadline = Date.now() + cleanupDeadlineMs
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
          await settleCleanupStep(close, deadline)
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

  const onRuntimeTerminal = (): void => {
    generationUnavailable = true
    lifecycle = runtimeUnavailableLifecycle(selection.workspace)
    void cleanup('runtime_terminal').catch(() => undefined)
  }
  const onAdapterLost = (): Promise<void> => {
    generationUnavailable = true
    lifecycle = runtimeUnavailableLifecycle(selection.workspace)
    return cleanup('adapter_lost')
  }

  try {
    listener = await options.ports.bindSharedListener({
      readLifecycle: () => lifecycle,
    })

    stage = 'broker_generation'
    broker = await options.ports.prepareBrokerGeneration({
      canonicalRoot: selection.canonicalRoot,
      listenerPort: listener.port,
    })
    const activeBroker = broker
    void activeBroker.adapterStatus.lost.then(
      () => {
        void onAdapterLost().catch(() => undefined)
      },
      () => {
        void onAdapterLost().catch(() => undefined)
      },
    )

    stage = 'workspace_runtime'
    runtime = await options.ports.spawnWorkspaceRuntime({
      canonicalRoot: selection.canonicalRoot,
      childEnvironment: activeBroker.childEnvironment,
    })
    void runtime.terminal.then(onRuntimeTerminal, onRuntimeTerminal)

    stage = 'adapter_handshake'
    const thread = await raceRuntimeTerminal(
      runtime.startWorkspaceThread(),
      runtime,
    )

    stage = 'native_project_config'
    requireInteractionMcpDeclaration(
      await raceRuntimeTerminal(
        runtime.loadNativeProjectConfig(),
        runtime,
      ),
      selection.canonicalRoot,
    )

    stage = 'adapter_lifecycle'
    await raceRuntimeTerminal(
      requireLiveAdapter(activeBroker),
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
    stage = 'product_thread_handoff'
    await raceRuntimeTerminal(
      runtime.handoffProductThread(thread.threadId),
      runtime,
    )
    if (generationUnavailable || activeBroker.adapterStatus.isLost()) {
      throw new RuntimeTerminatedDuringStartup()
    }

    const activeLifecycle = {
      state: 'active',
      workspace: workspaceSummary(fresh.workspace),
    } satisfies PreparedWorkspaceActiveLifecycle
    let registryAccepted = false
    const acceptCommit = (): boolean => {
      if (registryAccepted) return true
      if (
        generationUnavailable ||
        activeBroker.adapterStatus.isLost()
      ) {
        return false
      }
      registryAccepted = true
      return true
    }

    stage = 'registry_transaction'
    const registryStore =
      options.registryStore ??
      createWorkspaceRegistryStore({
        appDataRoot: options.appDataRoot,
      })
    try {
      await commitRegistryAuthority(
        registryStore,
        selection,
        acceptCommit,
      )
    } catch (cause) {
      if (
        !registryAccepted ||
        !(await registryAuthorityMatchesSelection(
          registryStore,
          selection,
        ))
      ) {
        throw cause
      }
    }
    if (!registryAccepted) {
      throw new TypeError(
        'Workspace registry transaction did not accept the generation',
      )
    }

    const adapterLostAfterCutover =
      activeBroker.adapterStatus.isLost()
    if (generationUnavailable || adapterLostAfterCutover) {
      lifecycle = runtimeUnavailableLifecycle(selection.workspace)
      if (adapterLostAfterCutover) {
        void onAdapterLost().catch(() => undefined)
      }
    } else {
      lifecycle = activeLifecycle
    }
    return Object.freeze({
      lifecycle: activeLifecycle,
      readLifecycle: () => lifecycle,
      close: () => cleanup('shutdown'),
    })
  } catch (cause) {
    lifecycle = runtimeUnavailableLifecycle(selection.workspace)
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

function requireInteractionMcpDeclaration(
  config: CodexEffectiveConfig,
  canonicalRoot: string,
): void {
  const declarations = config.mcpServers.filter(
    ({ name }) => name === requiredInteractionServer,
  )
  const declaration = declarations[0]
  const requiredCommand = path
    .relative(canonicalRoot, interactionAdapterPath)
    .split(path.sep)
    .join('/')
  if (
    declarations.length !== 1 ||
    !declaration ||
    declaration.command !== requiredCommand ||
    declaration.args.length !== 0 ||
    !sameEnvironmentVariables(
      declaration.envVars,
      requiredInteractionEnvironment,
    ) ||
    declaration.cwd !== null ||
    declaration.toolTimeoutSec !== null ||
    Object.keys(declaration.env).length !== 0 ||
    !declaration.enabled ||
    !declaration.required ||
    declaration.enabledTools === null ||
    declaration.disabledTools.length !== 0 ||
    !sameStringSet(
      declaration.enabledTools,
      requiredInteractionTools,
    )
  ) {
    throw new TypeError(
      'The required Interaction MCP declaration is invalid',
    )
  }
}

function sameEnvironmentVariables(
  left: readonly {
    readonly name: string
    readonly source: 'local' | 'remote' | null
  }[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (value, index) =>
        value.name === right[index] && value.source === null,
    )
  )
}

function sameStringSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const sortedLeft = [...left].sort()
  const sortedRight = [...right].sort()
  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every(
      (value, index) => value === sortedRight[index],
    )
  )
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
  acceptCommit: () => boolean,
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
    if (!acceptCommit()) {
      throw new RuntimeTerminatedDuringStartup()
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
    expectedWorkspaceId: selection.workspace.workspaceId,
    acceptCommit,
  })
  if (committed.status !== 'written') {
    throw new TypeError('Workspace registry transaction failed')
  }
}

async function registryAuthorityMatchesSelection(
  store: WorkspaceRegistryStore,
  selection: PreparedWorkspaceLaunchSelection,
): Promise<boolean> {
  try {
    const observed = await store.read()
    if (
      observed.status !== 'current' ||
      observed.registry.activeWorkspaceId !==
        selection.workspace.workspaceId
    ) {
      return false
    }
    return observed.registry.workspaces.some(
      (entry) =>
        entry.workspaceId === selection.workspace.workspaceId &&
        entry.canonicalRoot === selection.canonicalRoot,
    )
  } catch {
    return false
  }
}

async function raceRuntimeTerminal<T>(
  operation: Promise<T>,
  runtime: PreparedWorkspaceRuntimeGeneration,
): Promise<T> {
  const rejectTerminal = (): never => {
    throw new RuntimeTerminatedDuringStartup()
  }
  return Promise.race([
    operation,
    runtime.terminal.then<never>(rejectTerminal, rejectTerminal),
  ])
}

async function requireLiveAdapter(
  broker: PreparedWorkspaceBrokerGeneration,
): Promise<void> {
  const rejectLoss = (): never => {
    throw new AdapterLostDuringStartup()
  }
  if (broker.adapterStatus.isLost()) rejectLoss()
  await Promise.race([
    broker.adapterStatus.ready,
    broker.adapterStatus.lost.then<never>(rejectLoss, rejectLoss),
  ])
  if (broker.adapterStatus.isLost()) rejectLoss()
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

function runtimeUnavailableLifecycle(
  workspace: SemesterWorkspaceStateV4,
): PreparedWorkspaceRecoveryLifecycle {
  return {
    state: 'recovery_required',
    workspace: {
      availability: 'available',
      ...workspaceSummary(workspace),
    },
    reason: 'runtime_unavailable',
    displayMessage:
      'The workspace Runtime is unavailable. Restart AY-PLE after checking the prepared workspace.',
  }
}

function launchFailureLifecycle(
  failure: PreparedWorkspaceLaunchFailure | undefined,
): PreparedWorkspaceRecoveryLifecycle | undefined {
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
  if (failure?.code === 'registered_workspace_unavailable') {
    return {
      state: 'recovery_required',
      workspace: {
        availability: 'unavailable',
        workspaceId: failure.workspaceId,
        label: '등록된 학기 작업공간',
      },
      reason: 'workspace_unavailable',
      displayMessage:
        'The registered SemesterWorkspace is unavailable. Check the prepared workspace before restarting AY-PLE.',
    }
  }
  return undefined
}

class RuntimeTerminatedDuringStartup extends Error {}

class AdapterLostDuringStartup extends Error {}

class PreparedWorkspaceCleanupDeadlineError extends Error {
  constructor() {
    super('Prepared workspace cleanup exceeded its deadline')
    this.name = 'PreparedWorkspaceCleanupDeadlineError'
  }
}

function requireCleanupDeadline(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError('The prepared workspace cleanup deadline is invalid')
  }
  return value
}

async function settleCleanupStep(
  close: () => Promise<void>,
  deadline: number,
): Promise<void> {
  const attempt = Promise.resolve().then(close)
  const remaining = deadline - Date.now()
  if (remaining <= 0) {
    void attempt.catch(() => undefined)
    throw new PreparedWorkspaceCleanupDeadlineError()
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      attempt,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new PreparedWorkspaceCleanupDeadlineError()),
          remaining,
        )
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
