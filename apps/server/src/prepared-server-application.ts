import express from 'express'

import type {
  ProductWorkspaceLifecycle,
} from '@ay-ple/product-contract'

import {
  createCodexChatComposition,
  type CodexChatBootstrap,
} from './codex-chat.js'
import {
  createInlineSemanticReviewVertical,
} from './inline-semantic-review-vertical.js'
import type { InteractionBrokerCredentials } from './interaction-broker.js'
import { createPreparedProductRouter } from './prepared-product-http.js'
import {
  createPreparedProductOperationCoordinator,
} from './prepared-product-operation-coordinator.js'
import type { ServerApplication } from './server-application.js'

export type PreparedServerApplication = {
  readonly application: ServerApplication
  readonly credentials: InteractionBrokerCredentials
}

export async function createPreparedServerApplication(options: {
  readonly codexChat: CodexChatBootstrap
  readonly workspaceRoot: string
  readonly readLifecycle: () => ProductWorkspaceLifecycle
}): Promise<PreparedServerApplication> {
  const codexChat = createCodexChatComposition({
    bootstrap: options.codexChat,
  })
  let inlineReview:
    | Awaited<ReturnType<typeof createInlineSemanticReviewVertical>>
    | undefined
  const operations = createPreparedProductOperationCoordinator({
    service: codexChat.service,
    assertWorkspaceActive() {
      if (options.readLifecycle().state !== 'active') {
        throw new Error('Prepared workspace is not active')
      }
    },
    interactionTurnTerminal: () =>
      inlineReview?.turnTerminal() ?? Promise.resolve(),
    interactionRuntimeTerminal: () =>
      inlineReview?.runtimeTerminal() ?? Promise.resolve(),
  })
  inlineReview = await createInlineSemanticReviewVertical({
    workspaceRoot: options.workspaceRoot,
    productOperations: operations,
  })

  const app = express()
  app.use('/api/_private/interaction-mcp', inlineReview.router)
  app.use(
    '/api/product',
    createPreparedProductRouter({
      configuredOrigin: codexChat.origin,
      operations,
      review: inlineReview,
      readLifecycle: options.readLifecycle,
      readAccountReadiness: async () => {
        const readiness = await codexChat.service.readProductAccountReadiness()
        return readiness.state === 'ready'
          ? readiness
          : {
              state: 'not_ready',
              displayMessage: 'Codex에 로그인한 뒤 다시 시도해 주세요.',
            }
      },
      readCodexSettings: async () => {
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
      },
    }),
  )

  let closePromise: Promise<void> | undefined
  const application: ServerApplication = {
    app,
    semesterWorkspace: undefined,
    close() {
      closePromise ??= (async () => {
        operations.beginShutdown()
        codexChat.beginShutdown()
        await inlineReview?.appShutdown()
        await codexChat.close()
      })()
      return closePromise
    },
  }
  return {
    application,
    credentials: inlineReview.credentials(),
  }
}
