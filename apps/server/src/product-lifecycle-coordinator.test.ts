import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ProductLifecycleAdmissionError,
  createProductLifecycleCoordinator,
  type ProductLifecycleEligibility,
} from './product-lifecycle-coordinator.js'

const operationId = `operation_${'1'.repeat(32)}`
const candidateId = `candidate_${'2'.repeat(32)}`

test('transition and product Turn claims are one non-preemptive lease', () => {
  let lifecycle: ProductLifecycleEligibility = { state: 'active' }
  const coordinator = createProductLifecycleCoordinator({
    readEligibility: () => lifecycle,
  })

  const turn = coordinator.claimProductTurn({
    kind: 'chat',
    operationId,
  })
  assert.deepEqual(coordinator.activeOperation(), {
    kind: 'chat',
    operationId,
  })
  assert.throws(
    () => coordinator.claimWorkspaceTransition(),
    (error: unknown) =>
      error instanceof ProductLifecycleAdmissionError &&
      error.code === 'operation_busy' &&
      error.status === 409,
  )
  assert.deepEqual(coordinator.activeOperation(), {
    kind: 'chat',
    operationId,
  })

  assert.equal(coordinator.markProductTurnStarted(turn), true)
  assert.equal(coordinator.release(turn, 'start_failed'), false)
  assert.equal(coordinator.release(turn, 'native_terminal'), true)
  lifecycle = { state: 'bootstrap', candidateId }
  const transition = coordinator.claimWorkspaceTransition()
  assert.equal(coordinator.activeOperation(), null)
  assert.throws(
    () =>
      coordinator.claimProductTurn({
        kind: 'workspace_init',
        operationId,
        candidateId,
      }),
    (error: unknown) =>
      error instanceof ProductLifecycleAdmissionError &&
      error.code === 'operation_busy',
  )
  assert.equal(coordinator.release(transition, 'runtime_closed'), true)
})

test('eligibility is checked in the same critical section as claim', () => {
  let lifecycle: ProductLifecycleEligibility = {
    state: 'bootstrap',
    candidateId,
  }
  const coordinator = createProductLifecycleCoordinator({
    readEligibility: () => lifecycle,
  })

  assert.throws(
    () =>
      coordinator.claimProductTurn({
        kind: 'chat',
        operationId,
      }),
    (error: unknown) =>
      error instanceof ProductLifecycleAdmissionError &&
      error.code === 'operation_ineligible',
  )
  assert.equal(coordinator.activeOperation(), null)

  assert.throws(
    () =>
      coordinator.claimProductTurn({
        kind: 'workspace_init',
        operationId,
        candidateId: `candidate_${'3'.repeat(32)}`,
      }),
    (error: unknown) =>
      error instanceof ProductLifecycleAdmissionError &&
      error.code === 'operation_ineligible',
  )

  const init = coordinator.claimProductTurn({
    kind: 'workspace_init',
    operationId,
    candidateId,
  })
  lifecycle = { state: 'active' }
  assert.deepEqual(coordinator.activeOperation(), {
    kind: 'workspace_init',
    operationId,
  })
  assert.equal(coordinator.release(init, 'start_failed'), true)
})

test('transition eligibility callback cannot race a competing claim', () => {
  const events: string[] = []
  const coordinator = createProductLifecycleCoordinator({
    readEligibility: () => ({ state: 'active' }),
  })

  const transition = coordinator.claimWorkspaceTransition({
    assertEligible(eligibility) {
      events.push(eligibility.state)
      assert.throws(
        () =>
          coordinator.claimProductTurn({
            kind: 'chat',
            operationId,
          }),
        ProductLifecycleAdmissionError,
      )
    },
  })

  assert.deepEqual(events, ['active'])
  assert.equal(coordinator.release(transition, 'runtime_closed'), true)
})

test('interrupt and disconnect cannot release or duplicate-release a lease', () => {
  const coordinator = createProductLifecycleCoordinator({
    readEligibility: () => ({ state: 'active' }),
  })
  const turn = coordinator.claimProductTurn({
    kind: 'chat',
    operationId,
  })

  assert.deepEqual(coordinator.activeOperation(), {
    kind: 'chat',
    operationId,
  })
  assert.equal(coordinator.markProductTurnStarted(turn), true)
  assert.equal(coordinator.release(turn, 'native_terminal'), true)
  assert.equal(coordinator.release(turn, 'runtime_closed'), false)
  assert.equal(coordinator.activeOperation(), null)
})

test('shutdown blocks new work but keeps the outer lease until Runtime close', () => {
  const coordinator = createProductLifecycleCoordinator({
    readEligibility: () => ({ state: 'active' }),
  })
  const turn = coordinator.claimProductTurn({
    kind: 'chat',
    operationId,
  })

  assert.equal(coordinator.markProductTurnStarted(turn), true)
  coordinator.beginShutdown()
  assert.deepEqual(coordinator.activeOperation(), {
    kind: 'chat',
    operationId,
  })
  assert.throws(
    () => coordinator.claimWorkspaceTransition(),
    (error: unknown) =>
      error instanceof ProductLifecycleAdmissionError &&
      error.code === 'product_unavailable' &&
      error.status === 503,
  )
  assert.equal(coordinator.release(turn, 'runtime_closed'), true)
  assert.equal(coordinator.activeOperation(), null)
})
