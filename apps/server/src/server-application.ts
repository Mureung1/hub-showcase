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
  createInlineSemanticReviewVertical,
  type InlineSemanticReviewVertical,
} from './inline-semantic-review-vertical.js'
import type { InteractionBrokerCredentials } from './interaction-broker.js'
import type {
  ServerStartupCleanup,
  ServerStartupCleanupInput,
  ServerStartupCleanupResult,
} from './server-startup-cleanup.js'

import {
  createSemesterWorkspaceController,
  type SemesterWorkspaceController,
  type SemesterWorkspaceDirectoryChooser,
} from './semester-workspace.js'

export type CreateServerAppOptions = {
  codexChat?: CodexChatBootstrap
  productRuntime?: ProductRuntimeBootstrap
  productRuntimeWorkspaceRoot?: string
  semesterWorkspace?: SemesterWorkspaceBootstrap
  internalInteractionTarget?: {
    readonly workspaceRoot: string
    readonly onReady?: (
      credentials: InteractionBrokerCredentials,
    ) => void
  }
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

type CloseServerApplication = (
  input: ServerStartupCleanupInput,
) => Promise<void>

type ServerApplicationListenerLifecycle = (
  closeApplication: CloseServerApplication,
  input: ServerStartupCleanupInput,
) => Promise<void>

type ServerApplicationCleanupAttemptResult =
  | Extract<ServerStartupCleanupResult, { status: 'closed' }>
  | (
      Extract<ServerStartupCleanupResult, { status: 'ambiguous' }> & {
        readonly cause: unknown
      }
    )

type ServerApplicationLifecycle = {
  closing: boolean
  listenerClaimed: boolean
  readonly closeApplication: CloseServerApplication
  closeWithListener?: ServerApplicationListenerLifecycle
  cleanupPromise?: Promise<ServerApplicationCleanupAttemptResult>
  closePromise?: Promise<void>
}

const serverApplicationLifecycles = new WeakMap<
  ServerApplication,
  ServerApplicationLifecycle
>()

export async function createServerApplication(
  options: CreateServerAppOptions = {},
): Promise<ServerApplication> {
  const semesterWorkspace = options.semesterWorkspace
    ? createSemesterWorkspaceController(options.semesterWorkspace)
    : undefined
  const productRuntimeWorkspaceRoot = options.productRuntimeWorkspaceRoot
  const codexChat = createCodexChatComposition({
    bootstrap: options.codexChat,
    productRuntime: options.productRuntime,
    workspace: semesterWorkspace
      ? () => semesterWorkspace.nativeCwd()
      : productRuntimeWorkspaceRoot
        ? () => productRuntimeWorkspaceRoot
        : undefined,
  })
  const assignmentMcpHost = semesterWorkspace
    ? createAssignmentMcpHost()
    : undefined
  let inlineSemanticReview: InlineSemanticReviewVertical | undefined
  const productOperations =
    semesterWorkspace && options.semesterWorkspace && assignmentMcpHost
      ? createProductOperationCoordinator({
          controller: semesterWorkspace,
          mcpHost: assignmentMcpHost,
          service: codexChat.service,
          interactionTurnTerminal: () =>
            inlineSemanticReview?.turnTerminal() ?? Promise.resolve(),
          interactionRuntimeTerminal: () =>
            inlineSemanticReview?.runtimeTerminal() ?? Promise.resolve(),
        })
      : undefined
  if (options.internalInteractionTarget && !productOperations) {
    throw new TypeError(
      'The internal interaction target requires product operations',
    )
  }
  inlineSemanticReview =
    options.internalInteractionTarget && productOperations
      ? await createInlineSemanticReviewVertical({
          workspaceRoot: options.internalInteractionTarget.workspaceRoot,
          productOperations,
        })
      : undefined
  if (inlineSemanticReview && options.internalInteractionTarget?.onReady) {
    options.internalInteractionTarget.onReady(
      inlineSemanticReview.credentials(),
    )
  }
  const app = createServerExpressApp(
    codexChat,
    semesterWorkspace,
    productOperations,
    assignmentMcpHost,
    options.codexChat?.httpWriteDrainMs,
    inlineSemanticReview,
  )
  let applicationClosePromise: Promise<void> | undefined
  const closeApplication: CloseServerApplication = ({ signal }) => {
    const interactionClose = inlineSemanticReview?.appShutdown()
    productOperations?.beginShutdown()
    codexChat.beginShutdown()
    if (applicationClosePromise) return applicationClosePromise
    const attempt = closeServerApplication(
      codexChat,
      assignmentMcpHost,
      interactionClose,
    )
    applicationClosePromise = attempt
    void attempt.catch(() => {
      if (applicationClosePromise === attempt) {
        applicationClosePromise = undefined
      }
    })
    return attempt
  }
  const lifecycle: ServerApplicationLifecycle = {
    closing: false,
    listenerClaimed: false,
    closeApplication,
  }
  const application: ServerApplication = {
    app,
    semesterWorkspace,
    close() {
      if (lifecycle.closePromise) return lifecycle.closePromise
      const cleanup = cleanupServerApplication(lifecycle, {
        signal: new AbortController().signal,
      })
      const close = cleanup.then((result) => {
        if (
          result.status !== 'closed' ||
          !result.processTreeGone
        ) {
          throw result.cause
        }
      })
      lifecycle.closePromise = close
      void close.catch(() => {
        if (lifecycle.closePromise === close) {
          lifecycle.closePromise = undefined
        }
      })
      return close
    },
  }
  serverApplicationLifecycles.set(application, lifecycle)
  return application
}

export function claimServerApplicationListenerLifecycle(
  application: ServerApplication,
  closeWithListener: ServerApplicationListenerLifecycle,
): ServerStartupCleanup {
  const lifecycle = serverApplicationLifecycles.get(application)
  if (!lifecycle) {
    throw new TypeError(
      'The Server application was not created by createServerApplication',
    )
  }
  if (lifecycle.closing) {
    throw new Error('Server application is closing')
  }
  if (lifecycle.listenerClaimed) {
    throw new Error('Server application listener lifecycle is already claimed')
  }
  lifecycle.listenerClaimed = true
  lifecycle.closeWithListener = closeWithListener
  return async (input) => {
    const result = await cleanupServerApplication(lifecycle, input)
    return result.status === 'closed'
      ? result
      : { status: 'ambiguous', processTreeGone: false }
  }
}

function cleanupServerApplication(
  lifecycle: ServerApplicationLifecycle,
  input: ServerStartupCleanupInput,
): Promise<ServerApplicationCleanupAttemptResult> {
  if (lifecycle.cleanupPromise) return lifecycle.cleanupPromise
  lifecycle.closing = true
  const attempt = (async (): Promise<
    ServerApplicationCleanupAttemptResult
  > => {
    try {
      if (lifecycle.closeWithListener) {
        await lifecycle.closeWithListener(
          lifecycle.closeApplication,
          input,
        )
      } else {
        await lifecycle.closeApplication(input)
      }
      return { status: 'closed', processTreeGone: true }
    } catch (cause) {
      return {
        status: 'ambiguous',
        processTreeGone: false,
        cause,
      }
    }
  })()
  lifecycle.cleanupPromise = attempt
  void attempt.then(
    (result) => {
      if (
        result.status === 'ambiguous' &&
        lifecycle.cleanupPromise === attempt
      ) {
        lifecycle.cleanupPromise = undefined
      }
    },
    () => {
      if (lifecycle.cleanupPromise === attempt) {
        lifecycle.cleanupPromise = undefined
      }
    },
  )
  return attempt
}

function createServerExpressApp(
  codexChat: CodexChatComposition,
  semesterWorkspace: SemesterWorkspaceController | undefined,
  productOperations:
    | ReturnType<typeof createProductOperationCoordinator>
    | undefined,
  assignmentMcpHost: AssignmentMcpHost | undefined,
  productWriteDrainMs: number | undefined,
  inlineSemanticReview: InlineSemanticReviewVertical | undefined,
): Express {
  const app = express()
  if (assignmentMcpHost) {
    app.use('/api/product-mcp', assignmentMcpHost.router)
  }
  if (inlineSemanticReview) {
    app.use('/api/_private/interaction-mcp', inlineSemanticReview.router)
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
      productOperations
        ? async () => {
            const catalog = await codexChat.service.readProductModelCatalog()
            return {
              models: catalog.models.map((model) => ({
                model: model.model,
                displayName: model.displayName,
                description: model.description,
                isDefault: model.isDefault,
                defaultReasoningEffort: model.defaultReasoningEffort,
                supportedReasoningEfforts: model.supportedReasoningEfforts,
                fastModeAvailable: model.serviceTiers.includes('fast'),
                fastModeDefault: model.defaultServiceTier === 'fast',
              })),
            }
          }
        : undefined,
      inlineSemanticReview,
    ),
  )
  return app
}

async function closeServerApplication(
  codexChat: CodexChatComposition,
  assignmentMcpHost: AssignmentMcpHost | undefined,
  interactionClose: Promise<void> | undefined,
): Promise<void> {
  await interactionClose
  await codexChat.close().finally(() => assignmentMcpHost?.close())
}
