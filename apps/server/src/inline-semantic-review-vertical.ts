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
  appShutdown(): Promise<void>
}

export async function createInlineSemanticReviewVertical(options: {
  readonly workspaceRoot: string
  readonly productOperations: ProductOperationCoordinator
}): Promise<InlineSemanticReviewVertical> {
  let pendingInteractionId: string | undefined
  const broker = await createInteractionBroker({
    workspaceRoot: options.workspaceRoot,
    activeProductTurn: () =>
      options.productOperations.activeInteractionProductTurn(),
    uiAdapter: {
      publish: async (frame) => {
        if (frame.type === 'review.requested') {
          pendingInteractionId = frame.interactionId
        }
        try {
          await options.productOperations.publishInteractionReview(frame)
        } catch (error) {
          if (
            frame.type === 'review.requested' &&
            pendingInteractionId === frame.interactionId
          ) {
            pendingInteractionId = undefined
          }
          throw error
        }
        if (
          frame.type !== 'review.requested' &&
          pendingInteractionId === frame.interactionId
        ) {
          pendingInteractionId = undefined
        }
      },
    },
    interruptProductTurn: (turn) =>
      options.productOperations.interruptInteractionProductTurn(turn),
  })
  return {
    router: broker.router,
    credentials: () => broker.credentials(),
    settle: (interactionId, result) => broker.settle(interactionId, result),
    browserDisconnected: () => broker.browserDisconnected(),
    turnInterrupted: async () => {
      const interruptedPendingReview = pendingInteractionId !== undefined
      await broker.turnInterrupted()
      return interruptedPendingReview
    },
    appShutdown: () => broker.appShutdown(),
  }
}
