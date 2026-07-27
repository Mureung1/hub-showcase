export type ProductLifecycleEligibility =
  | { readonly state: 'active' }
  | {
      readonly state: 'bootstrap'
      readonly candidateId: string | null
    }
  | { readonly state: 'blocked' }

export type ProductLifecycleProductTurn =
  | {
      readonly kind: 'chat'
      readonly operationId: string
    }
  | {
      readonly kind: 'workspace_init'
      readonly operationId: string
      readonly candidateId: string
    }

export type ProductLifecycleLease = {
  readonly kind: 'workspace_transition' | 'product_turn'
}

export type ProductLifecycleReleaseAuthority =
  | 'start_failed'
  | 'native_terminal'
  | 'runtime_closed'

export type ProductLifecycleCoordinator = {
  activeOperation(): {
    readonly operationId: string
    readonly kind: 'chat' | 'workspace_init'
  } | null
  claimProductTurn(input: ProductLifecycleProductTurn): ProductLifecycleLease
  claimWorkspaceTransition(options?: {
    readonly assertEligible?: (
      eligibility: ProductLifecycleEligibility,
    ) => void
  }): ProductLifecycleLease
  markProductTurnStarted(lease: ProductLifecycleLease): boolean
  release(
    lease: ProductLifecycleLease,
    authority: ProductLifecycleReleaseAuthority,
  ): boolean
  beginShutdown(): void
}

type InternalLease = ProductLifecycleLease & {
  readonly turn: ProductLifecycleProductTurn | null
  phase: 'starting' | 'started'
}

export class ProductLifecycleAdmissionError extends Error {
  readonly code:
    | 'operation_busy'
    | 'operation_ineligible'
    | 'product_unavailable'
  readonly status: 409 | 503

  constructor(
    code: ProductLifecycleAdmissionError['code'],
    status: ProductLifecycleAdmissionError['status'],
  ) {
    super(code)
    this.name = 'ProductLifecycleAdmissionError'
    this.code = code
    this.status = status
  }
}

export function createProductLifecycleCoordinator(options: {
  readonly readEligibility: () => ProductLifecycleEligibility
}): ProductLifecycleCoordinator {
  let active: InternalLease | undefined
  let claiming = false
  let shuttingDown = false

  const claim = (
    turn: ProductLifecycleProductTurn | null,
    assertEligible: (eligibility: ProductLifecycleEligibility) => void,
  ): ProductLifecycleLease => {
    if (shuttingDown) {
      throw new ProductLifecycleAdmissionError(
        'product_unavailable',
        503,
      )
    }
    if (active || claiming) {
      throw new ProductLifecycleAdmissionError('operation_busy', 409)
    }
    claiming = true
    try {
      const eligibility = options.readEligibility()
      assertEligible(eligibility)
      const lease = {
        kind: turn === null ? 'workspace_transition' : 'product_turn',
        turn,
        phase: 'starting',
      } satisfies InternalLease
      active = lease
      return lease
    } finally {
      claiming = false
    }
  }

  return {
    activeOperation() {
      const turn = active?.turn
      return turn
        ? { operationId: turn.operationId, kind: turn.kind }
        : null
    },

    claimProductTurn(input) {
      if (
        !/^operation_[0-9a-f]{32}$/.test(input.operationId) ||
        (input.kind === 'workspace_init' &&
          !/^candidate_[0-9a-f]{32}$/.test(input.candidateId))
      ) {
        throw new ProductLifecycleAdmissionError(
          'operation_ineligible',
          409,
        )
      }
      return claim(input, (eligibility) => {
        if (input.kind === 'chat') {
          if (eligibility.state !== 'active') throw ineligible()
          return
        }
        if (
          eligibility.state !== 'bootstrap' ||
          eligibility.candidateId === null ||
          eligibility.candidateId !== input.candidateId
        ) {
          throw ineligible()
        }
      })
    },

    claimWorkspaceTransition(claimOptions = {}) {
      return claim(null, (eligibility) => {
        claimOptions.assertEligible?.(eligibility)
      })
    },

    markProductTurnStarted(lease) {
      if (
        active !== lease ||
        active.kind !== 'product_turn' ||
        active.phase !== 'starting'
      ) {
        return false
      }
      active.phase = 'started'
      return true
    },

    release(lease, authority) {
      if (active !== lease) return false
      if (
        (authority === 'start_failed' &&
          (active.kind !== 'product_turn' ||
            active.phase !== 'starting')) ||
        (authority === 'native_terminal' &&
          (active.kind !== 'product_turn' || active.phase !== 'started'))
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

function ineligible(): ProductLifecycleAdmissionError {
  return new ProductLifecycleAdmissionError('operation_ineligible', 409)
}
