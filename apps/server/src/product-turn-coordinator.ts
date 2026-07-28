export type ProductTurnLease = {
  readonly kind: 'product_turn'
}

export type ProductTurnReleaseAuthority =
  | 'start_failed'
  | 'native_terminal'
  | 'runtime_closed'

export type ProductTurnCoordinator = {
  activeOperation(): {
    readonly operationId: string
    readonly kind: 'product_turn'
  } | null
  claimProductTurn(input: {
    readonly operationId: string
  }): ProductTurnLease
  markProductTurnStarted(lease: ProductTurnLease): boolean
  release(
    lease: ProductTurnLease,
    authority: ProductTurnReleaseAuthority,
  ): boolean
  beginShutdown(): void
}

type InternalLease = ProductTurnLease & {
  readonly operationId: string
  phase: 'starting' | 'started'
}

export class ProductTurnAdmissionError extends Error {
  readonly code:
    | 'operation_busy'
    | 'operation_ineligible'
    | 'product_unavailable'
  readonly status: 409 | 503

  constructor(
    code: ProductTurnAdmissionError['code'],
    status: ProductTurnAdmissionError['status'],
  ) {
    super(code)
    this.name = 'ProductTurnAdmissionError'
    this.code = code
    this.status = status
  }
}

export function createProductTurnCoordinator(options: {
  readonly assertEligible: () => void
}): ProductTurnCoordinator {
  let active: InternalLease | undefined
  let claiming = false
  let shuttingDown = false

  return {
    activeOperation() {
      return active
        ? {
            operationId: active.operationId,
            kind: 'product_turn',
          }
        : null
    },

    claimProductTurn(input) {
      if (shuttingDown) {
        throw new ProductTurnAdmissionError('product_unavailable', 503)
      }
      if (active || claiming) {
        throw new ProductTurnAdmissionError('operation_busy', 409)
      }
      if (!/^operation_[0-9a-f]{32}$/.test(input.operationId)) {
        throw new ProductTurnAdmissionError('operation_ineligible', 409)
      }
      claiming = true
      try {
        options.assertEligible()
        const lease = {
          kind: 'product_turn',
          operationId: input.operationId,
          phase: 'starting',
        } satisfies InternalLease
        active = lease
        return lease
      } finally {
        claiming = false
      }
    },

    markProductTurnStarted(lease) {
      if (active !== lease || active.phase !== 'starting') {
        return false
      }
      active.phase = 'started'
      return true
    },

    release(lease, authority) {
      if (active !== lease) return false
      if (
        (authority === 'start_failed' && active.phase !== 'starting') ||
        (authority === 'native_terminal' && active.phase !== 'started')
      ) {
        return false
      }
      active = undefined
      return true
    },

    beginShutdown() {
      shuttingDown = true
    },
  }
}
