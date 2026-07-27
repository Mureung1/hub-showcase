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
  const application = await createServerApplication({
    productRuntime: productDevelopment?.runtime,
    productRuntimeWorkspaceRoot: productDevelopment?.runtimeWorkspaceRoot,
    semesterWorkspace: productDevelopment?.semesterWorkspace,
  })
  let ownedApplication = application
  try {
    if (productDevelopment?.semesterWorkspace) {
      const activation = await application.semesterWorkspace?.activate()
      if (activation?.status !== 'activated') {
        throw new Error('Product SemesterWorkspace activation was cancelled.')
      }
      if (activation.workspace.state === 'ready') {
        log(
          `SemesterWorkspace active: ${application.semesterWorkspace?.nativeCwd()}`,
        )
      } else {
        const foundStoreFormatVersion =
          activation.workspace.foundStoreFormatVersion ?? 'unknown'
        log(
          `SemesterWorkspace read-only: store format ${foundStoreFormatVersion}`,
        )
      }
    }
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
  const runtimeDeferred = deferred<CodexWorkspaceRuntime>()
  const target = await createPreparedServerApplication({
    codexChat: {
      sourceCommit: '8c68d4c87dc54d38861f5114e920c3de2efa5876',
      runtimeVersion: '0.144.4',
      origin: input.productDevelopment.runtime.origin,
      createRuntime: () => runtimeDeferred.promise,
    },
    workspaceRoot,
    readLifecycle: () => readLifecycle(),
  })
  let session: PreparedWorkspaceActiveSession | undefined
  try {
    const ports: PreparedWorkspaceStartupPorts = {
      async bindSharedListener(options) {
        readLifecycle = options.readLifecycle
        const listener = await bindServerApplicationListener({
          host: input.host,
          port: input.port,
          requestHandler: target.application.app,
        })
        return {
          port: listener.port,
          async close() {
            const result = await listener.close({
              signal: new AbortController().signal,
            })
            if (result.status !== 'closed') {
              throw new Error('Prepared Server listener cleanup was ambiguous')
            }
          },
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
          runtimeTerminal: () => target.application.close(),
          adapterLost: () => target.application.close(),
          appShutdown: () => target.application.close(),
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
        runtimeDeferred.resolve(runtime)
        let startupThreadId: string | undefined
        return {
          terminal: runtime.terminal,
          async loadNativeProjectConfig() {
            const signal = new AbortController().signal
            await Promise.all([
              runtime.readEffectiveConfig({ signal }),
              runtime.listEffectiveSkills({ signal }),
            ])
          },
          async startWorkspaceThread() {
            const thread = await runtime.startThread()
            startupThreadId = thread.threadId
            return thread
          },
          waitForRequiredMcp: (waitInput) =>
            runtime.waitForMcpServerReady(waitInput),
          async confirmThreadContext(context) {
            if (
              context.canonicalRoot !== options.canonicalRoot ||
              context.threadId !== startupThreadId
            ) {
              throw new Error('Prepared Runtime thread context changed')
            }
            await runtime.releaseThread({ threadId: context.threadId })
            startupThreadId = undefined
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
      semesterWorkspace: undefined,
      close() {
        closePromise ??= activeSession
          .close()
          .finally(() => target.application.close())
        return closePromise
      },
    }
    input.log(`SemesterWorkspace active: ${workspaceRoot}`)
    input.log(`server listening on http://${input.host}:${input.port}`)
    return { application, port: input.port }
  } catch (error) {
    await session?.close().catch(() => undefined)
    await target.application.close().catch(() => undefined)
    throw error
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
