import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ProductTurnAdmissionError,
  createProductTurnCoordinator,
} from './product-turn-coordinator.js'

const operationId = `operation_${'1'.repeat(32)}`

test('normal product Turns share one non-preemptive lease', () => {
  let eligible = true
  const coordinator = createProductTurnCoordinator({
    assertEligible() {
      if (!eligible) {
        throw new ProductTurnAdmissionError('operation_ineligible', 409)
      }
    },
  })

  const lease = coordinator.claimProductTurn({ operationId })
  assert.deepEqual(coordinator.activeOperation(), {
    kind: 'product_turn',
    operationId,
  })
  assert.throws(
    () =>
      coordinator.claimProductTurn({
        operationId: `operation_${'2'.repeat(32)}`,
      }),
    (error: unknown) =>
      error instanceof ProductTurnAdmissionError &&
      error.code === 'operation_busy' &&
      error.status === 409,
  )

  assert.equal(coordinator.markProductTurnStarted(lease), true)
  assert.equal(coordinator.release(lease, 'start_failed'), false)
  assert.equal(coordinator.release(lease, 'native_terminal'), true)
  assert.equal(coordinator.release(lease, 'native_terminal'), false)

  eligible = false
  assert.throws(
    () =>
      coordinator.claimProductTurn({
        operationId: `operation_${'3'.repeat(32)}`,
      }),
    (error: unknown) =>
      error instanceof ProductTurnAdmissionError &&
      error.code === 'operation_ineligible',
  )
  assert.equal(coordinator.activeOperation(), null)
})

test('eligibility and claim stay in one critical section', () => {
  let coordinator: ReturnType<typeof createProductTurnCoordinator>
  coordinator = createProductTurnCoordinator({
    assertEligible() {
      assert.throws(
        () =>
          coordinator.claimProductTurn({
            operationId: `operation_${'2'.repeat(32)}`,
          }),
        (error: unknown) =>
          error instanceof ProductTurnAdmissionError &&
          error.code === 'operation_busy',
      )
    },
  })

  const lease = coordinator.claimProductTurn({ operationId })
  assert.equal(coordinator.release(lease, 'start_failed'), true)
})

test('shutdown blocks new work without releasing an accepted Turn', () => {
  const coordinator = createProductTurnCoordinator({
    assertEligible() {},
  })
  const lease = coordinator.claimProductTurn({ operationId })
  assert.equal(coordinator.markProductTurnStarted(lease), true)

  coordinator.beginShutdown()
  assert.deepEqual(coordinator.activeOperation(), {
    kind: 'product_turn',
    operationId,
  })
  assert.throws(
    () =>
      coordinator.claimProductTurn({
        operationId: `operation_${'2'.repeat(32)}`,
      }),
    (error: unknown) =>
      error instanceof ProductTurnAdmissionError &&
      error.code === 'product_unavailable' &&
      error.status === 503,
  )
  assert.equal(coordinator.release(lease, 'runtime_closed'), true)
  assert.equal(coordinator.activeOperation(), null)
})
