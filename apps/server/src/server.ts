import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { pathToFileURL } from 'node:url'

import dotenv from 'dotenv'
import express, { type Express } from 'express'

import { createProductOperationCoordinator } from './product-operation-coordinator.js'
import {
  createAssignmentMcpHost,
  type AssignmentMcpHost,
} from './assignment-mcp-host.js'
import {
  createCodexChatComposition,
  type CodexChatBootstrap,
  type CodexChatComposition,
  type ProductRuntimeBootstrap,
} from './codex-chat.js'
import {
  createSemesterWorkspaceController,
  type SemesterWorkspaceController,
  type SemesterWorkspaceDirectoryChooser,
} from './semester-workspace.js'
import { createProductRouter } from './product-http.js'
import { resolveProductDevelopmentBootstrap } from './product-development.js'

dotenv.config()

const serverHost = '127.0.0.1'

export type CreateServerAppOptions = {
  codexChat?: CodexChatBootstrap
  productRuntime?: ProductRuntimeBootstrap
  semesterWorkspace?: SemesterWorkspaceBootstrap
}

export type SemesterWorkspaceBootstrap = {
  readonly appDataRoot: string
  readonly chooseDirectory: SemesterWorkspaceDirectoryChooser
  readonly packageRoot: string
}

export interface ServerApplication {
  readonly app: Express
  readonly semesterWorkspace: SemesterWorkspaceController | undefined
  listen(port: number, host?: string): Promise<{ readonly port: number }>
  close(): Promise<void>
}

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

export async function createServerApplication(
  options: CreateServerAppOptions = {},
): Promise<ServerApplication> {
  const semesterWorkspace = options.semesterWorkspace
    ? createSemesterWorkspaceController(options.semesterWorkspace)
    : undefined
  const codexChat = createCodexChatComposition({
    bootstrap: options.codexChat,
    productRuntime: options.productRuntime,
    workspace: semesterWorkspace
      ? () => semesterWorkspace.nativeCwd()
      : undefined,
  })
  const assignmentMcpHost = semesterWorkspace
    ? createAssignmentMcpHost()
    : undefined
  const productOperations =
    semesterWorkspace && options.semesterWorkspace && assignmentMcpHost
      ? createProductOperationCoordinator({
          controller: semesterWorkspace,
          mcpHost: assignmentMcpHost,
          service: codexChat.service,
        })
      : undefined
  const app = createServerExpressApp(
    codexChat,
    semesterWorkspace,
    productOperations,
    assignmentMcpHost,
    options.codexChat?.httpWriteDrainMs,
  )
  let listener: Server | undefined
  let closePromise: Promise<void> | undefined
  let closing = false

  return {
    app,
    semesterWorkspace,
    async listen(listenPort, host) {
      if (closing) throw new Error('Server application is closing')
      if (listener) throw new Error('Server application is already listening')
      listener = createServer(app)
      await new Promise<void>((resolve, reject) => {
        listener?.once('error', reject)
        listener?.listen(listenPort, host, () => {
          listener?.off('error', reject)
          resolve()
        })
      })
      const address = listener.address()
      if (!address || typeof address === 'string') {
        throw new Error('Expected the Server application to bind a TCP port')
      }
      return { port: (address as AddressInfo).port }
    },
    close() {
      closing = true
      productOperations?.beginShutdown()
      codexChat.beginShutdown()
      closePromise ??= closeServerApplication(
        listener,
        codexChat,
        assignmentMcpHost,
      )
      return closePromise
    },
  }
}

function createServerExpressApp(
  codexChat: CodexChatComposition,
  semesterWorkspace: SemesterWorkspaceController | undefined,
  productOperations: ReturnType<typeof createProductOperationCoordinator> | undefined,
  assignmentMcpHost: AssignmentMcpHost | undefined,
  productWriteDrainMs: number | undefined,
): Express {
  const app = express()
  if (assignmentMcpHost) {
    app.use('/api/product-mcp', assignmentMcpHost.router)
  }
  app.use(
    '/api/product',
    createProductRouter(
      semesterWorkspace,
      codexChat.origin,
      productOperations,
      productWriteDrainMs,
      productOperations
        ? () => codexChat.service.readProductAccountReadiness()
        : undefined,
    ),
  )
  return app
}

async function closeServerApplication(
  listener: Server | undefined,
  codexChat: CodexChatComposition,
  assignmentMcpHost: AssignmentMcpHost | undefined,
): Promise<void> {
  const listenerClosed = listener
    ? new Promise<void>((resolve, reject) => {
        listener.close((error) => {
          if (error) {
            reject(error)
            return
          }
          resolve()
        })
      })
    : Promise.resolve()

  const runtimeClosed = codexChat.close().finally(() => {
    assignmentMcpHost?.close()
    listener?.closeAllConnections()
  })
  const [runtimeResult, listenerResult] = await Promise.allSettled([
    runtimeClosed,
    listenerClosed,
  ])
  if (runtimeResult.status === 'rejected') throw runtimeResult.reason
  if (listenerResult.status === 'rejected') throw listenerResult.reason
}

export async function startConfiguredServerApplication(
  options: StartConfiguredServerApplicationOptions = {},
): Promise<StartedServerApplication> {
  const environment = options.environment ?? process.env
  const log = options.log ?? console.log
  const productDevelopment = resolveProductDevelopmentBootstrap(environment)
  const application = await createServerApplication({
    productRuntime: productDevelopment?.runtime,
    semesterWorkspace: productDevelopment?.semesterWorkspace,
  })
  try {
    if (productDevelopment) {
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
    const address = await application.listen(
      options.port ?? Number(environment.PORT ?? 3000),
      options.host ?? serverHost,
    )
    log(`server listening on http://${options.host ?? serverHost}:${address.port}`)
    return { application, port: address.port }
  } catch (error) {
    await application.close().catch(() => undefined)
    throw error
  }
}

async function startServer(): Promise<void> {
  const { application } = await startConfiguredServerApplication()

  let shuttingDown = false
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return
    shuttingDown = true
    void application
      .close()
      .catch((error: unknown) => {
        console.error(
          `Unable to close server: ${error instanceof Error ? error.message : String(error)}`,
        )
      })
      .finally(() => {
        process.off('SIGINT', onSigint)
        process.off('SIGTERM', onSigterm)
        process.kill(process.pid, signal)
      })
  }
  const onSigint = () => shutdown('SIGINT')
  const onSigterm = () => shutdown('SIGTERM')
  process.once('SIGINT', onSigint)
  process.once('SIGTERM', onSigterm)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void startServer().catch((error: unknown) => {
    console.error(
      `Unable to start server: ${error instanceof Error ? error.message : String(error)}`,
    )
    process.exitCode = 1
  })
}
