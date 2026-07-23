import express, { type Express } from 'express'

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
import { createProductRouter } from './product-http.js'
import { createProductOperationCoordinator } from './product-operation-coordinator.js'
import {
  createSemesterWorkspaceController,
  type SemesterWorkspaceController,
  type SemesterWorkspaceDirectoryChooser,
} from './semester-workspace.js'

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
  close(): Promise<void>
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
  let closePromise: Promise<void> | undefined

  return {
    app,
    semesterWorkspace,
    close() {
      productOperations?.beginShutdown()
      codexChat.beginShutdown()
      closePromise ??= closeServerApplication(codexChat, assignmentMcpHost)
      return closePromise
    },
  }
}

function createServerExpressApp(
  codexChat: CodexChatComposition,
  semesterWorkspace: SemesterWorkspaceController | undefined,
  productOperations:
    | ReturnType<typeof createProductOperationCoordinator>
    | undefined,
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
  codexChat: CodexChatComposition,
  assignmentMcpHost: AssignmentMcpHost | undefined,
): Promise<void> {
  await codexChat.close().finally(() => {
    assignmentMcpHost?.close()
  })
}
