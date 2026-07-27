import type { ProductReviewResult } from '@ay-ple/product-contract'
import type { Router } from 'express'

import {
  createInteractionBroker,
  type InteractionBrokerCredentials,
} from './interaction-broker.js'
import type { ProductOperationCoordinator } from './product-operation-coordinator.js'

export type InlineSemanticReviewVertical = {
  readonly router: Router
  credentials(): InteractionBrokerCredentials
  settle(interactionId: string, result: ProductReviewResult): Promise<void>
  browserDisconnected(): Promise<void>
  turnInterrupted(): Promise<boolean>
  turnTerminal(): Promise<void>
  runtimeTerminal(): Promise<void>
  appShutdown(): Promise<void>
}

export async function createInlineSemanticReviewVertical(options: {
  readonly workspaceRoot: string
  readonly productOperations: ProductOperationCoordinator
}): Promise<InlineSemanticReviewVertical> {
  const broker = await createInteractionBroker({
    workspaceRoot: options.workspaceRoot,
    activeProductTurn: () =>
      options.productOperations.activeInteractionProductTurn(),
    uiAdapter: {
      publish: (frame) =>
        options.productOperations.publishInteractionReview(frame),
    },
    interruptProductTurn: (turn) =>
      options.productOperations.interruptInteractionProductTurn(turn),
  })
  return {
    router: broker.router,
    credentials: () => broker.credentials(),
    settle: (interactionId, result) => broker.settle(interactionId, result),
    browserDisconnected: () => broker.browserDisconnected(),
    turnInterrupted: () => broker.turnInterrupted(),
    turnTerminal: () => broker.turnTerminal(),
    runtimeTerminal: () => broker.runtimeTerminal(),
    appShutdown: () => broker.appShutdown(),
  }
}
