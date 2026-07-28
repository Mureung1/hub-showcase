import express from 'express'

import type {
  ProductWorkspaceLifecycle,
} from '@ay-ple/product-contract'

import {
  createCodexChatComposition,
  type CodexChatBootstrap,
} from './codex-chat.js'
import {
  createInteractionBroker,
  type InteractionAdapterStatus,
  type InteractionBroker,
  type InteractionBrokerCredentials,
} from './interaction-broker.js'
import { createPreparedProductRouter } from './prepared-product-http.js'
import {
  createPreparedProductOperationCoordinator,
} from './prepared-product-operation-coordinator.js'
import type { ServerApplication } from './server-application.js'
import { createWorkspaceSourceProjection } from './workspace-source-projection.js'

export type PreparedServerApplication = {
  readonly application: ServerApplication
  readonly adapterStatus: InteractionAdapterStatus
  readonly credentials: InteractionBrokerCredentials
  runtimeTerminal(): Promise<void>
  adapterLost(): Promise<void>
  appShutdown(): Promise<void>
}

export async function createPreparedServerApplication(options: {
  readonly codexChat: CodexChatBootstrap
  readonly workspaceRoot: string
  readonly readLifecycle: () => ProductWorkspaceLifecycle
}): Promise<PreparedServerApplication> {
  const sources = await createWorkspaceSourceProjection({
    workspaceRoot: options.workspaceRoot,
  })
  const codexChat = createCodexChatComposition({
    bootstrap: options.codexChat,
  })
  let interactionBroker: InteractionBroker | undefined
  const operations = createPreparedProductOperationCoordinator({
    service: codexChat.service,
    assertWorkspaceActive() {
      if (options.readLifecycle().state !== 'active') {
        throw new Error('Prepared workspace is not active')
      }
    },
    interactionTurnTerminal: () =>
      interactionBroker?.turnTerminal() ?? Promise.resolve(),
    interactionRuntimeTerminal: () =>
      interactionBroker?.runtimeTerminal() ?? Promise.resolve(),
  })
  interactionBroker = await createInteractionBroker({
    workspaceRoot: options.workspaceRoot,
    activeProductTurn: () => operations.activeInteractionProductTurn(),
    uiAdapter: {
      publish: (frame) => operations.publishInteractionReview(frame),
    },
    interruptProductTurn: (turn) =>
      operations.interruptInteractionProductTurn(turn),
  })

  const app = express()
  app.use('/api/_private/interaction-mcp', interactionBroker.router)
  app.use(
    '/api/product',
    createPreparedProductRouter({
      configuredOrigin: codexChat.origin,
      operations,
      review: interactionBroker,
      sources,
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
  const close = (
    reason: 'runtime_terminal' | 'adapter_lost' | 'app_shutdown',
  ): Promise<void> => {
    closePromise ??= (async () => {
      operations.beginShutdown()
      codexChat.beginShutdown()
      if (reason === 'adapter_lost') {
        await interactionBroker?.adapterLost()
      } else if (reason === 'runtime_terminal') {
        await interactionBroker?.runtimeTerminal()
      } else {
        await interactionBroker?.appShutdown()
      }
      await codexChat.close()
    })()
    return closePromise
  }
  const application: ServerApplication = {
    app,
    close: () => close('app_shutdown'),
  }
  return {
    application,
    adapterStatus: interactionBroker.adapterStatus,
    credentials: interactionBroker.credentials(),
    runtimeTerminal: () => close('runtime_terminal'),
    adapterLost: () => close('adapter_lost'),
    appShutdown: () => close('app_shutdown'),
  }
}
