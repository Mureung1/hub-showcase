import type { ProductReviewResult } from '@ay-ple/product-contract'
import type { Router } from 'express'

import {
  createInteractionBroker,
  type InteractionBrokerCredentials,
} from './interaction-broker.js'
import type { ActiveInteractionProductTurn } from './interaction-broker.js'

export type InlineSemanticReviewProductOperations = {
  activeInteractionProductTurn(): ActiveInteractionProductTurn | undefined
  interruptInteractionProductTurn(
    turn: ActiveInteractionProductTurn,
  ): Promise<void>
  publishInteractionReview(frame: import('@ay-ple/product-contract').ProductReviewFrame): Promise<void>
}

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
  readonly productOperations: InlineSemanticReviewProductOperations
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
