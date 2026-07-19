import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { pathToFileURL } from 'node:url'

import dotenv from 'dotenv'
import express, { type Express } from 'express'

import {
  createCodexChatComposition,
  type CodexChatBootstrap,
  type CodexChatComposition,
} from './codex-chat.js'
import {
  createSemesterWorkspaceController,
  type SemesterWorkspaceController,
  type SemesterWorkspaceDirectoryChooser,
} from './semester-workspace.js'
import { createProductRouter } from './product-http.js'

dotenv.config()

const port = Number(process.env.PORT ?? 3000)
const serverHost = '127.0.0.1'

export type CreateServerAppOptions = {
  codexChat?: CodexChatBootstrap
  codexChatEnvironment?: NodeJS.ProcessEnv
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

export async function createServerApplication(
  options: CreateServerAppOptions = {},
): Promise<ServerApplication> {
  const codexChat = createCodexChatComposition({
    bootstrap: options.codexChat,
    environment: options.codexChatEnvironment,
  })
  const semesterWorkspace = options.semesterWorkspace
    ? createSemesterWorkspaceController(options.semesterWorkspace)
    : undefined
  const app = createServerExpressApp(codexChat, semesterWorkspace)
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
      codexChat.beginShutdown()
      closePromise ??= closeServerApplication(listener, codexChat)
      return closePromise
    },
  }
}

function createServerExpressApp(
  codexChat: CodexChatComposition,
  semesterWorkspace: SemesterWorkspaceController | undefined,
): Express {
  const app = express()
  app.use('/api/codex-chat', codexChat.router)
  app.use(
    '/api/product',
    createProductRouter(semesterWorkspace, codexChat.origin),
  )
  return app
}

async function closeServerApplication(
  listener: Server | undefined,
  codexChat: CodexChatComposition,
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
    listener?.closeAllConnections()
  })
  const [runtimeResult, listenerResult] = await Promise.allSettled([
    runtimeClosed,
    listenerClosed,
  ])
  if (runtimeResult.status === 'rejected') throw runtimeResult.reason
  if (listenerResult.status === 'rejected') throw listenerResult.reason
}

async function startServer(): Promise<void> {
  const application = await createServerApplication()
  const address = await application.listen(port, serverHost)
  console.log(`server listening on http://${serverHost}:${address.port}`)

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
