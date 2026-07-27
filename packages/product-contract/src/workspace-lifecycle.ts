import {
  invalidContract,
  isExactObject,
  isNonEmptyString,
  isProductCandidateId,
  isProductWorkspaceId,
  isRecord,
  isTargetProductOperationId,
  utf8Bytes,
} from './contract-values.js'
import {
  decodeProductAccountReadiness,
  type ProductAccountReadiness,
} from './workspace.js'

const termKeyMaxBytes = 64
const termDisplayNameMaxBytes = 128
const workspaceLabelMaxBytes = 256

export type ProductSemesterIdentity = {
  readonly yearLevel: number
  readonly term: {
    readonly key: string
    readonly displayName: string
  }
}

export type ProductWorkspaceSummary = {
  readonly workspaceId: string
  readonly semester: ProductSemesterIdentity
  readonly label: string
}

export type ProductAvailableWorkspaceReference = ProductWorkspaceSummary & {
  readonly availability: 'available'
}

export type ProductUnavailableWorkspaceReference = {
  readonly availability: 'unavailable'
  readonly workspaceId: string
  readonly label: string
}

export type ProductBootstrapCandidate = {
  readonly candidateId: string
  readonly semester: ProductSemesterIdentity
  readonly label: string
  readonly initTurn:
    | { readonly state: 'not_started' }
    | {
        readonly state: 'active'
        readonly operationId: string
      }
    | {
        readonly state: 'terminal'
        readonly operationId: string
        readonly outcome: 'completed' | 'failed' | 'interrupted'
      }
}

export type ProductWorkspaceLifecycle =
  | {
      readonly state: 'bootstrap'
      readonly activeWorkspace: ProductWorkspaceSummary | null
      readonly candidate: ProductBootstrapCandidate | null
    }
  | {
      readonly state: 'active'
      readonly activeWorkspace: ProductWorkspaceSummary
      readonly candidate: null
    }
  | {
      readonly state: 'transitioning'
      readonly activeWorkspace: ProductWorkspaceSummary | null
      readonly candidate: ProductBootstrapCandidate | null
      readonly target:
        | {
            readonly kind: 'bootstrap_candidate'
            readonly candidateId: string
          }
        | {
            readonly kind: 'candidate_activation'
            readonly candidateId: string
          }
        | {
            readonly kind: 'active_restart'
            readonly workspaceId: string
          }
    }
  | {
      readonly state: 'recovery_required'
      readonly activeWorkspace: ProductUnavailableWorkspaceReference
      readonly candidate: ProductBootstrapCandidate | null
      readonly reason: 'workspace_unavailable'
      readonly displayMessage: string
    }
  | {
      readonly state: 'recovery_required'
      readonly activeWorkspace: ProductAvailableWorkspaceReference | null
      readonly candidate: ProductBootstrapCandidate | null
      readonly reason: 'runtime_unavailable'
      readonly displayMessage: string
    }
  | {
      readonly state: 'registry_incompatible'
      readonly activeWorkspace: null
      readonly candidate: null
      readonly displayMessage: string
    }

export type TargetProductBootstrap = {
  readonly accountReadiness: ProductAccountReadiness
  readonly workspaceLifecycle: ProductWorkspaceLifecycle
  readonly activeOperation: {
    readonly operationId: string
    readonly kind: 'chat' | 'workspace_init'
  } | null
}

export function decodeTargetProductBootstrap(
  value: unknown,
): TargetProductBootstrap {
  if (
    !isExactObject(value, [
      'accountReadiness',
      'activeOperation',
      'workspaceLifecycle',
    ])
  ) {
    throw invalidContract()
  }
  const workspaceLifecycle = decodeProductWorkspaceLifecycle(
    value.workspaceLifecycle,
  )
  const activeOperation = decodeActiveOperation(value.activeOperation)
  assertOperationInvariant(workspaceLifecycle, activeOperation)
  return {
    accountReadiness: decodeProductAccountReadiness(value.accountReadiness),
    workspaceLifecycle,
    activeOperation,
  }
}

export function decodeProductWorkspaceLifecycle(
  value: unknown,
): ProductWorkspaceLifecycle {
  if (!isRecord(value) || typeof value.state !== 'string') {
    throw invalidContract()
  }
  switch (value.state) {
    case 'bootstrap':
      return decodeBootstrapLifecycle(value)
    case 'active':
      return decodeActiveLifecycle(value)
    case 'transitioning':
      return decodeTransitioningLifecycle(value)
    case 'recovery_required':
      return decodeRecoveryLifecycle(value)
    case 'registry_incompatible':
      return decodeRegistryIncompatibleLifecycle(value)
    default:
      throw invalidContract()
  }
}

function decodeBootstrapLifecycle(
  value: Record<string, unknown>,
): Extract<ProductWorkspaceLifecycle, { state: 'bootstrap' }> {
  if (!isExactObject(value, ['activeWorkspace', 'candidate', 'state'])) {
    throw invalidContract()
  }
  return {
    state: 'bootstrap',
    activeWorkspace: decodeWorkspaceSummaryOrNull(value.activeWorkspace),
    candidate: decodeCandidateOrNull(value.candidate),
  }
}

function decodeActiveLifecycle(
  value: Record<string, unknown>,
): Extract<ProductWorkspaceLifecycle, { state: 'active' }> {
  if (
    !isExactObject(value, ['activeWorkspace', 'candidate', 'state']) ||
    value.candidate !== null
  ) {
    throw invalidContract()
  }
  return {
    state: 'active',
    activeWorkspace: decodeWorkspaceSummary(value.activeWorkspace),
    candidate: null,
  }
}

function decodeTransitioningLifecycle(
  value: Record<string, unknown>,
): Extract<ProductWorkspaceLifecycle, { state: 'transitioning' }> {
  if (
    !isExactObject(value, [
      'activeWorkspace',
      'candidate',
      'state',
      'target',
    ])
  ) {
    throw invalidContract()
  }
  const activeWorkspace = decodeWorkspaceSummaryOrNull(value.activeWorkspace)
  const candidate = decodeCandidateOrNull(value.candidate)
  const target = decodeTransitionTarget(value.target)
  if (
    (target.kind === 'candidate_activation' &&
      (candidate === null || candidate.candidateId !== target.candidateId)) ||
    (target.kind === 'active_restart' &&
      (candidate !== null ||
        activeWorkspace === null ||
        activeWorkspace.workspaceId !== target.workspaceId))
  ) {
    throw invalidContract()
  }
  return {
    state: 'transitioning',
    activeWorkspace,
    candidate,
    target,
  }
}

function decodeRecoveryLifecycle(
  value: Record<string, unknown>,
): Extract<ProductWorkspaceLifecycle, { state: 'recovery_required' }> {
  if (
    !isExactObject(value, [
      'activeWorkspace',
      'candidate',
      'displayMessage',
      'reason',
      'state',
    ]) ||
    !isNonEmptyString(value.displayMessage)
  ) {
    throw invalidContract()
  }
  const candidate = decodeCandidateOrNull(value.candidate)
  if (value.reason === 'workspace_unavailable') {
    return {
      state: 'recovery_required',
      activeWorkspace: decodeUnavailableWorkspaceReference(
        value.activeWorkspace,
      ),
      candidate,
      reason: 'workspace_unavailable',
      displayMessage: value.displayMessage,
    }
  }
  if (value.reason === 'runtime_unavailable') {
    return {
      state: 'recovery_required',
      activeWorkspace:
        value.activeWorkspace === null
          ? null
          : decodeAvailableWorkspaceReference(value.activeWorkspace),
      candidate,
      reason: 'runtime_unavailable',
      displayMessage: value.displayMessage,
    }
  }
  throw invalidContract()
}

function decodeRegistryIncompatibleLifecycle(
  value: Record<string, unknown>,
): Extract<ProductWorkspaceLifecycle, { state: 'registry_incompatible' }> {
  if (
    !isExactObject(value, [
      'activeWorkspace',
      'candidate',
      'displayMessage',
      'state',
    ]) ||
    value.activeWorkspace !== null ||
    value.candidate !== null ||
    !isNonEmptyString(value.displayMessage)
  ) {
    throw invalidContract()
  }
  return {
    state: 'registry_incompatible',
    activeWorkspace: null,
    candidate: null,
    displayMessage: value.displayMessage,
  }
}

function decodeTransitionTarget(
  value: unknown,
): Extract<
  ProductWorkspaceLifecycle,
  { state: 'transitioning' }
>['target'] {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    throw invalidContract()
  }
  if (
    (value.kind === 'bootstrap_candidate' ||
      value.kind === 'candidate_activation') &&
    isExactObject(value, ['candidateId', 'kind']) &&
    isProductCandidateId(value.candidateId)
  ) {
    return { kind: value.kind, candidateId: value.candidateId }
  }
  if (
    value.kind === 'active_restart' &&
    isExactObject(value, ['kind', 'workspaceId']) &&
    isProductWorkspaceId(value.workspaceId)
  ) {
    return { kind: 'active_restart', workspaceId: value.workspaceId }
  }
  throw invalidContract()
}

function decodeWorkspaceSummary(value: unknown): ProductWorkspaceSummary {
  if (!isExactObject(value, ['label', 'semester', 'workspaceId'])) {
    throw invalidContract()
  }
  return decodeWorkspaceSummaryFields(value)
}

function decodeWorkspaceSummaryOrNull(
  value: unknown,
): ProductWorkspaceSummary | null {
  return value === null ? null : decodeWorkspaceSummary(value)
}

function decodeAvailableWorkspaceReference(
  value: unknown,
): ProductAvailableWorkspaceReference {
  if (
    !isExactObject(value, [
      'availability',
      'label',
      'semester',
      'workspaceId',
    ]) ||
    value.availability !== 'available'
  ) {
    throw invalidContract()
  }
  return {
    availability: 'available',
    ...decodeWorkspaceSummaryFields(value),
  }
}

function decodeWorkspaceSummaryFields(
  value: Record<string, unknown>,
): ProductWorkspaceSummary {
  if (
    !isProductWorkspaceId(value.workspaceId) ||
    !isSafeWorkspaceLabel(value.label)
  ) {
    throw invalidContract()
  }
  return {
    workspaceId: value.workspaceId,
    semester: decodeSemesterIdentity(value.semester),
    label: value.label,
  }
}

function decodeUnavailableWorkspaceReference(
  value: unknown,
): ProductUnavailableWorkspaceReference {
  if (
    !isExactObject(value, ['availability', 'label', 'workspaceId']) ||
    value.availability !== 'unavailable' ||
    !isProductWorkspaceId(value.workspaceId) ||
    !isSafeWorkspaceLabel(value.label)
  ) {
    throw invalidContract()
  }
  return {
    availability: 'unavailable',
    workspaceId: value.workspaceId,
    label: value.label,
  }
}

function decodeCandidate(value: unknown): ProductBootstrapCandidate {
  if (
    !isExactObject(value, [
      'candidateId',
      'initTurn',
      'label',
      'semester',
    ]) ||
    !isProductCandidateId(value.candidateId) ||
    !isSafeWorkspaceLabel(value.label)
  ) {
    throw invalidContract()
  }
  return {
    candidateId: value.candidateId,
    semester: decodeSemesterIdentity(value.semester),
    label: value.label,
    initTurn: decodeInitTurn(value.initTurn),
  }
}

function decodeCandidateOrNull(
  value: unknown,
): ProductBootstrapCandidate | null {
  return value === null ? null : decodeCandidate(value)
}

function decodeInitTurn(
  value: unknown,
): ProductBootstrapCandidate['initTurn'] {
  if (!isRecord(value) || typeof value.state !== 'string') {
    throw invalidContract()
  }
  if (
    value.state === 'not_started' &&
    isExactObject(value, ['state'])
  ) {
    return { state: 'not_started' }
  }
  if (
    value.state === 'active' &&
    isExactObject(value, ['operationId', 'state']) &&
    isTargetProductOperationId(value.operationId)
  ) {
    return { state: 'active', operationId: value.operationId }
  }
  if (
    value.state === 'terminal' &&
    isExactObject(value, ['operationId', 'outcome', 'state']) &&
    isTargetProductOperationId(value.operationId) &&
    (value.outcome === 'completed' ||
      value.outcome === 'failed' ||
      value.outcome === 'interrupted')
  ) {
    return {
      state: 'terminal',
      operationId: value.operationId,
      outcome: value.outcome,
    }
  }
  throw invalidContract()
}

function decodeSemesterIdentity(value: unknown): ProductSemesterIdentity {
  if (
    !isExactObject(value, ['term', 'yearLevel']) ||
    !Number.isSafeInteger(value.yearLevel) ||
    Number(value.yearLevel) < 1 ||
    Number(value.yearLevel) > 20 ||
    !isExactObject(value.term, ['displayName', 'key']) ||
    typeof value.term.key !== 'string' ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.term.key) ||
    utf8Bytes(value.term.key) > termKeyMaxBytes ||
    typeof value.term.displayName !== 'string' ||
    value.term.displayName.trim().length === 0 ||
    utf8Bytes(value.term.displayName) > termDisplayNameMaxBytes
  ) {
    throw invalidContract()
  }
  return {
    yearLevel: Number(value.yearLevel),
    term: {
      key: value.term.key,
      displayName: value.term.displayName,
    },
  }
}

function decodeActiveOperation(
  value: unknown,
): TargetProductBootstrap['activeOperation'] {
  if (value === null) return null
  if (
    !isExactObject(value, ['kind', 'operationId']) ||
    !isTargetProductOperationId(value.operationId) ||
    (value.kind !== 'chat' && value.kind !== 'workspace_init')
  ) {
    throw invalidContract()
  }
  return { operationId: value.operationId, kind: value.kind }
}

function assertOperationInvariant(
  lifecycle: ProductWorkspaceLifecycle,
  operation: TargetProductBootstrap['activeOperation'],
): void {
  const candidate = 'candidate' in lifecycle ? lifecycle.candidate : null
  const candidateOperationId =
    candidate?.initTurn.state === 'active'
      ? candidate.initTurn.operationId
      : null
  if (operation === null) {
    if (candidateOperationId !== null) throw invalidContract()
    return
  }
  if (operation.kind === 'chat') {
    if (lifecycle.state !== 'active' || candidateOperationId !== null) {
      throw invalidContract()
    }
    return
  }
  if (
    lifecycle.state !== 'bootstrap' ||
    lifecycle.candidate === null ||
    candidateOperationId !== operation.operationId
  ) {
    throw invalidContract()
  }
}

function isSafeWorkspaceLabel(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    utf8Bytes(value) <= workspaceLabelMaxBytes &&
    !/[\p{Cc}/\\]/u.test(value)
  )
}
