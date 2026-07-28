import {
  createCodexChatRuntime,
  verifyCodexChatRuntimeBundle,
  type CodexWorkspaceRuntime,
} from '@ay-ple/codex-chat-runtime'

import { resolveProductDevelopmentBootstrap } from './product-development.js'
import {
  createServerApplication,
  type ServerApplication,
} from './server-application.js'
import {
  bindServerApplicationListener,
  listenToServerApplication,
} from './server-listener.js'
import { createPreparedServerApplication } from './prepared-server-application.js'
import {
  PreparedWorkspaceStartupError,
  startPreparedWorkspace,
  type PreparedWorkspaceActiveSession,
  type PreparedWorkspaceStartupPorts,
} from './prepared-workspace-startup.js'

const serverHost = '127.0.0.1'

export type StartConfiguredServerApplicationOptions = {
  readonly environment?: NodeJS.ProcessEnv
  readonly host?: string
  readonly log?: (message: string) => void
  readonly port?: number
}

export type StartedServerApplication = {
  readonly application: ServerApplication
  readonly port: number
}

export async function startConfiguredServerApplication(
  options: StartConfiguredServerApplicationOptions = {},
): Promise<StartedServerApplication> {
  const environment = options.environment ?? process.env
  const log = options.log ?? console.log
  const productDevelopment = await resolveProductDevelopmentBootstrap(
    environment,
  )
  if (
    productDevelopment?.selectedWorkspaceRoot &&
    (environment.AY_PLE_WORKSPACE_SELECTION === 'explicit' ||
      environment.AY_PLE_WORKSPACE_SELECTION === 'registry')
  ) {
    return startPreparedConfiguredServerApplication({
      environment,
      host: options.host ?? serverHost,
      log,
      port: options.port ?? Number(environment.PORT ?? 3000),
      productDevelopment,
    })
  }
  const application = await createServerApplication()
  let ownedApplication = application
  try {
    const host = options.host ?? serverHost
    const started = await listenToServerApplication(application, {
      host,
      port: options.port ?? Number(environment.PORT ?? 3000),
    })
    ownedApplication = started.application
    log(`server listening on http://${host}:${started.port}`)
    return started
  } catch (error) {
    await ownedApplication.close().catch(() => undefined)
    throw error
  }
}

async function startPreparedConfiguredServerApplication(input: {
  readonly environment: NodeJS.ProcessEnv
  readonly host: string
  readonly log: (message: string) => void
  readonly port: number
  readonly productDevelopment: NonNullable<
    Awaited<ReturnType<typeof resolveProductDevelopmentBootstrap>>
  >
}): Promise<StartedServerApplication> {
  const workspaceRoot = input.productDevelopment.selectedWorkspaceRoot
  if (!workspaceRoot) throw new Error('Prepared workspace root is missing')
  let readLifecycle =
    (() => {
      throw new Error('Prepared workspace lifecycle is not bound')
    }) as Parameters<
      typeof createPreparedServerApplication
  >[0]['readLifecycle']
  const handoff = createPreparedProductThreadHandoff()
  const target = await createPreparedServerApplication({
    codexChat: {
      sourceCommit: '8c68d4c87dc54d38861f5114e920c3de2efa5876',
      runtimeVersion: '0.144.4',
      origin: input.productDevelopment.runtime.origin,
      createRuntime: handoff.createRuntime,
      acquireProductThread: handoff.acquireProductThread,
    },
    workspaceRoot,
    readLifecycle: () => readLifecycle(),
  })
  let session: PreparedWorkspaceActiveSession | undefined
  let startupThreadId: string | undefined
  let listenerPort: number | undefined
  let ownedListener:
    | Awaited<ReturnType<typeof bindServerApplicationListener>>
    | undefined
  const closeOwnedListener = async (): Promise<void> => {
    const listener = ownedListener
    if (!listener) return
    ownedListener = undefined
    const result = await listener.close({
      signal: new AbortController().signal,
    })
    if (result.status !== 'closed') {
      throw new Error('Prepared Server listener cleanup was ambiguous')
    }
  }
  try {
    const ports: PreparedWorkspaceStartupPorts = {
      async bindSharedListener(options) {
        readLifecycle = options.readLifecycle
        const listener = await bindServerApplicationListener({
          host: input.host,
          port: input.port,
          requestHandler: target.application.app,
        })
        ownedListener = listener
        listenerPort = listener.port
        return {
          port: listener.port,
          close: async () => undefined,
        }
      },
      async prepareBrokerGeneration(options) {
        return {
          childEnvironment: {
            AY_PLE_INTERACTION_BROKER_URL:
              `http://127.0.0.1:${options.listenerPort}/api/_private/interaction-mcp`,
            AY_PLE_INTERACTION_BROKER_TOKEN: target.credentials.token,
            AY_PLE_INTERACTION_RUNTIME_BINDING: target.credentials.binding,
          },
          adapterStatus: target.adapterStatus,
          runtimeTerminal: () => target.runtimeTerminal(),
          adapterLost: () => target.adapterLost(),
          appShutdown: () => target.appShutdown(),
        }
      },
      async spawnWorkspaceRuntime(options) {
        await verifyCodexChatRuntimeBundle(
          input.productDevelopment.runtime.runtimeRoot,
        )
        const runtime = await createCodexChatRuntime({
          runtimeRoot: input.productDevelopment.runtime.runtimeRoot,
          workspace: options.canonicalRoot,
          environment: input.productDevelopment.runtime.environment,
          childEnvironment: options.childEnvironment,
        })
        handoff.bindRuntime(runtime)
        return {
          terminal: runtime.terminal,
          async loadNativeProjectConfig() {
            const signal = new AbortController().signal
            const [config] = await Promise.all([
              runtime.readEffectiveConfig({ signal }),
              runtime.listEffectiveSkills({ signal }),
            ])
            return config
          },
          async startWorkspaceThread() {
            const thread = await runtime.startThread()
            startupThreadId = thread.threadId
            return thread
          },
          async confirmThreadContext(context) {
            if (
              context.canonicalRoot !== options.canonicalRoot ||
              context.threadId !== startupThreadId
            ) {
              throw new Error('Prepared Runtime thread context changed')
            }
          },
          async handoffProductThread(threadId) {
            if (threadId !== startupThreadId) {
              throw new Error('Prepared Product thread context changed')
            }
            handoff.bindProductThread(threadId)
          },
          close: () => runtime.close(),
        }
      },
    }
    session = await startPreparedWorkspace({
      appDataRoot: input.productDevelopment.runtime.appDataRoot,
      ...(input.environment.AY_PLE_WORKSPACE_SELECTION === 'registry'
        ? {}
        : { explicitWorkspaceRoot: workspaceRoot }),
      ports,
    })
    const activeSession = session
    let closePromise: Promise<void> | undefined
    const application: ServerApplication = {
      app: target.application.app,
      close() {
        closePromise ??= closePreparedHost([
          () => activeSession.close(),
          closeOwnedListener,
          () => target.application.close(),
        ])
        return closePromise
      },
    }
    const activePort = listenerPort ?? input.port
    input.log(
      activeSession.readLifecycle().state === 'active'
        ? `SemesterWorkspace active: ${workspaceRoot}`
        : 'SemesterWorkspace recovery: post-cutover continuity loss',
    )
    input.log(`server listening on http://${input.host}:${activePort}`)
    return { application, port: activePort }
  } catch (error) {
    await session?.close().catch(() => undefined)
    if (
      error instanceof PreparedWorkspaceStartupError &&
      error.lifecycle &&
      ownedListener
    ) {
      let closePromise: Promise<void> | undefined
      const application: ServerApplication = {
        app: target.application.app,
        close() {
          closePromise ??= closePreparedHost([
            closeOwnedListener,
            () => target.application.close(),
          ])
          return closePromise
        },
      }
      const recoveryPort = listenerPort ?? input.port
      input.log(`SemesterWorkspace recovery: ${error.stage}`)
      input.log(`server listening on http://${input.host}:${recoveryPort}`)
      return { application, port: recoveryPort }
    }
    await closeOwnedListener().catch(() => undefined)
    await target.application.close().catch(() => undefined)
    throw error
  }
}

export function createPreparedProductThreadHandoff(): {
  readonly createRuntime: () => Promise<CodexWorkspaceRuntime>
  readonly acquireProductThread: (
    runtime: CodexWorkspaceRuntime,
  ) => Promise<string>
  readonly bindRuntime: (runtime: CodexWorkspaceRuntime) => void
  readonly bindProductThread: (threadId: string) => void
} {
  const runtimeDeferred = deferred<CodexWorkspaceRuntime>()
  const productThreadDeferred = deferred<string>()
  let boundRuntime: CodexWorkspaceRuntime | undefined
  let boundThreadId: string | undefined
  return Object.freeze({
    createRuntime: () => runtimeDeferred.promise,
    async acquireProductThread(runtime) {
      if ((await runtimeDeferred.promise) !== runtime) {
        throw new Error('Prepared Product Runtime changed')
      }
      return productThreadDeferred.promise
    },
    bindRuntime(runtime) {
      if (boundRuntime && boundRuntime !== runtime) {
        throw new Error('Prepared Product Runtime was already bound')
      }
      if (boundRuntime) return
      boundRuntime = runtime
      runtimeDeferred.resolve(runtime)
    },
    bindProductThread(threadId) {
      if (!boundRuntime) {
        throw new Error('Prepared Product Runtime is not bound')
      }
      if (typeof threadId !== 'string' || threadId.length === 0) {
        throw new TypeError('Prepared Product thread is invalid')
      }
      if (boundThreadId && boundThreadId !== threadId) {
        throw new Error('Prepared Product thread was already bound')
      }
      if (boundThreadId) return
      boundThreadId = threadId
      productThreadDeferred.resolve(threadId)
    },
  })
}

async function closePreparedHost(
  steps: ReadonlyArray<() => Promise<void>>,
): Promise<void> {
  const errors: unknown[] = []
  for (const step of steps) {
    try {
      await step()
    } catch (error) {
      errors.push(error)
    }
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, 'Prepared Server cleanup failed')
  }
}

function deferred<T>(): {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}
