/// <reference types="node" />

import { randomUUID } from 'node:crypto'
import { constants as fsConstants } from 'node:fs'
import {
  lstat,
  open,
  readdir,
  realpath,
  rmdir,
} from 'node:fs/promises'
import path from 'node:path'

import {
  createSemesterWorkspaceAdmission,
  type RestorableSemesterWorkspaceAdmission,
} from './admission.js'
import type {
  ActiveReadyPointer,
  AdmittedSemesterWorkspace,
  LaunchBinding,
  PendingSetupReceipt,
  SemesterSetupInput,
  SetupCommand,
  SetupJourney,
  SetupReconcileResult,
  SetupStateEnvelope,
  VerifiedBundleSource,
  WorkspaceAdmissionPlanDescription,
  WorkspaceParentAuthority,
} from './contract.js'
import {
  type RecoverableSetupEnvelopeStore,
} from './setup-envelope-store.js'
import {
  recoverMissingWorkspaceBundle,
  materializeWorkspaceBundle,
  verifyWorkspaceBundle,
} from './workspace-bundle.js'
import { verifyWorkspaceStaticContext } from './workspace-context.js'

export type SemesterSetupParentSelection = {
  readonly authority: WorkspaceParentAuthority
  readonly presentation: {
    readonly selectionId: string
    readonly displayName: string
    readonly safeDisplayLocation: string
  }
}

export type SemesterSetupJourneyProjection =
  | { readonly state: 'input_required' }
  | {
      readonly state: 'confirmation_required'
      readonly setupPlanId: string
      readonly semesterLabel: string
      readonly parentSelection: SemesterSetupParentSelection['presentation']
      readonly leafName: string
    }
  | {
      readonly state: 'working'
      readonly stage: 'preparing_workspace' | 'verifying_environment'
    }
  | {
      readonly state: 'recovery_required'
      readonly recoveryId: string
      readonly reason:
        | 'owned_incomplete'
        | 'bundle_missing'
        | 'bundle_conflict'
        | 'context_conflict'
    }
  | {
      readonly state: 'blocked'
      readonly reason:
        | 'setup_conflict'
        | 'setup_state_conflict'
        | 'setup_release_mismatch'
    }
  | {
      readonly state: 'workspace_reauth'
      readonly recoveryId: string
    }
  | {
      readonly state: 'transition_blocked'
      readonly reason:
        | 'setup_transition_unavailable'
        | 'account_unavailable'
      readonly retry: 'resume' | 'restart_required'
      readonly recoveryId?: string
    }
  | {
      readonly state: 'ready'
      readonly recoveryId: string
      readonly workspace: AdmittedSemesterWorkspace
    }

export type SemesterSetupJourneyFaultPoint =
  | 'after_approved_commit'
  | 'after_workspace_admission'
  | 'after_bundle_materialization'
  | 'before_prepared_commit'
  | 'after_prepared_commit'
  | 'after_discard_intent_commit'
  | 'after_workspace_discard'
  | 'before_empty_commit'
  | 'after_empty_commit'
  | 'before_ready_commit'
  | 'after_ready_commit'

export type SemesterSetupJourneyOptions = {
  readonly stateStore: RecoverableSetupEnvelopeStore
  readonly release: LaunchBinding
  readonly bundleSource: VerifiedBundleSource
  readonly resolveParent: (
    selectionId: string,
  ) => Promise<SemesterSetupParentSelection | null>
  readonly createAdmission?: () => RestorableSemesterWorkspaceAdmission
  readonly createSetupId?: () => string
  readonly fault?: (
    point: SemesterSetupJourneyFaultPoint,
  ) => void | Promise<void>
}

export type SemesterReadyTransitionResult =
  | {
      readonly status: 'ready'
      readonly ready: ActiveReadyPointer
    }
  | { readonly status: 'reauth_required' }
  | { readonly status: 'account_unavailable' }
  | { readonly status: 'bundle_missing' }
  | { readonly status: 'context_conflict' }
  | {
      readonly status: 'transition_unavailable'
      readonly retry: 'resume' | 'restart_required'
    }
  | { readonly status: 'cancelled' }
  | { readonly status: 'ready_commit_unknown' }

export interface SemesterReadyTransitionPort {
  transition(input: {
    readonly workspace: AdmittedSemesterWorkspace
    readonly expectedReady: ActiveReadyPointer
    readonly commitReady: () => Promise<ActiveReadyPointer>
    readonly readReady: () => Promise<ActiveReadyPointer>
  }): Promise<SemesterReadyTransitionResult>
}

export type LeaseBoundSemesterSetupJourneyOptions =
  SemesterSetupJourneyOptions & {
    readonly readyTransition: SemesterReadyTransitionPort
  }

export type SemesterReadyValidationFailureReason =
  | 'bundle_missing'
  | 'context_conflict'

export class SemesterReadyValidationError extends Error {
  readonly reason: SemesterReadyValidationFailureReason

  constructor(
    reason: SemesterReadyValidationFailureReason = 'context_conflict',
  ) {
    super('The workspace changed before Ready attestation.')
    this.name = 'SemesterReadyValidationError'
    this.reason = reason
  }
}

type PreparedDraft = {
  readonly expectedRevisionToken: string | null
  readonly nextRevision: number
  readonly planDescription: WorkspaceAdmissionPlanDescription
  readonly projection: Extract<
    SemesterSetupJourneyProjection,
    { state: 'confirmation_required' }
  >
}

export function createSemesterSetupJourney(
  options: SemesterSetupJourneyOptions,
): SetupJourney<SemesterSetupJourneyProjection> {
  return createSetupJourney(options)
}

export function createLeaseBoundSemesterSetupJourney(
  options: LeaseBoundSemesterSetupJourneyOptions,
): SetupJourney<SemesterSetupJourneyProjection> {
  return createSetupJourney(options, options.readyTransition)
}

function createSetupJourney(
  options: SemesterSetupJourneyOptions,
  readyTransition?: SemesterReadyTransitionPort,
): SetupJourney<SemesterSetupJourneyProjection> {
  const createAdmission =
    options.createAdmission ?? createSemesterWorkspaceAdmission
  const createSetupId =
    options.createSetupId ??
    (() => `setup_transaction_${randomUUID().replaceAll('-', '')}`)
  let projection: SemesterSetupJourneyProjection = {
    state: 'input_required',
  }
  let draft: PreparedDraft | undefined
  let tail = Promise.resolve()
  const approvePromises = new Map<
    string,
    Promise<SetupReconcileResult<SemesterSetupJourneyProjection>>
  >()

  const enqueue = (
    operation: () => Promise<
      SetupReconcileResult<SemesterSetupJourneyProjection>
    >,
  ): Promise<
    SetupReconcileResult<SemesterSetupJourneyProjection>
  > => {
    const result = tail.then(operation, operation)
    tail = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  const reconcile = (
    command: SetupCommand,
  ): Promise<
    SetupReconcileResult<SemesterSetupJourneyProjection>
  > => {
    if (command.kind === 'approve') {
      const existing = approvePromises.get(command.setupPlanId)
      if (existing) return existing
      const promise = enqueue(() => approve(command.setupPlanId))
      approvePromises.set(command.setupPlanId, promise)
      void promise.then(
        () => {
          if (approvePromises.get(command.setupPlanId) === promise) {
            approvePromises.delete(command.setupPlanId)
          }
        },
        () => {
          if (approvePromises.get(command.setupPlanId) === promise) {
            approvePromises.delete(command.setupPlanId)
          }
        },
      )
      return promise
    }
    return enqueue(() => dispatch(command))
  }

  const dispatch = async (
    command: Exclude<SetupCommand, { kind: 'approve' }>,
  ): Promise<
    SetupReconcileResult<SemesterSetupJourneyProjection>
  > => {
    switch (command.kind) {
      case 'launch':
        return launch()
      case 'prepare':
        return prepare(command.input)
      case 'return_to_input':
        return returnToInput(command.setupPlanId)
      case 'recover':
        return command.action === 'discard'
          ? discard(command.recoveryId)
          : resume(command.recoveryId)
    }
  }

  const launch = async (): Promise<
    SetupReconcileResult<SemesterSetupJourneyProjection>
  > => {
    const recovered = await options.stateStore.reconcileAbandonedWrite()
    if (recovered.status === 'absent') return inputRequired()
    if (recovered.status === 'incompatible') {
      return blocked('setup_state_conflict')
    }
    if (recovered.envelope.state.kind === 'empty') {
      return inputRequired()
    }
    if (recovered.envelope.state.kind === 'active_ready') {
      return readyTransition
        ? relaunchReady(recovered.envelope.state.pointer)
        : blocked('setup_state_conflict')
    }
    const receipt = recovered.envelope.state.receipt
    if (!sameRelease(receipt.release, options.release)) {
      return blocked('setup_release_mismatch')
    }
    if (receipt.lifecycle.phase === 'discard_requested') {
      return continueDiscard(recovered)
    }
    if (receipt.lifecycle.phase === 'prepared') {
      return validatePrepared(receipt)
    }
    return prepareApproved(recovered)
  }

  const prepare = async (
    input: SemesterSetupInput,
  ): Promise<
    SetupReconcileResult<SemesterSetupJourneyProjection>
  > => {
    const observed = await options.stateStore.read()
    const empty =
      observed.status === 'absent' ||
      (observed.status === 'current' &&
        observed.envelope.state.kind === 'empty')
    if (!empty) {
      return observed.status === 'incompatible'
        ? blocked('setup_state_conflict')
        : blocked('setup_conflict')
    }
    const parent = await options.resolveParent(input.parentSelectionId)
    if (
      !parent ||
      parent.authority.selectionId !== input.parentSelectionId ||
      parent.presentation.selectionId !== input.parentSelectionId
    ) {
      return blocked('setup_conflict')
    }
    const admission = createAdmission()
    const inspection = await admission.inspect({
      kind: 'create',
      parent: parent.authority,
      semester: {
        yearLevel: input.yearLevel,
        term: {
          key: input.term.key,
          displayName: input.term.displayName,
        },
      },
      leafName: input.leafName,
    })
    if (inspection.outcome !== 'new_target') {
      return blocked('setup_conflict')
    }
    const description = admission.describe(inspection.plan)
    if (!description) return blocked('setup_conflict')
    const nextRevision =
      observed.status === 'current'
        ? observed.envelope.revision + 1
        : 1
    const confirmation = {
      state: 'confirmation_required',
      setupPlanId: description.setupPlanId,
      semesterLabel: `${input.yearLevel}학년 ${input.term.displayName}`,
      parentSelection: {
        selectionId: parent.presentation.selectionId,
        displayName: parent.presentation.displayName,
        safeDisplayLocation: parent.presentation.safeDisplayLocation,
      },
      leafName: input.leafName,
    } as const satisfies SemesterSetupJourneyProjection
    draft = {
      expectedRevisionToken:
        observed.status === 'current'
          ? observed.revisionToken
          : null,
      nextRevision,
      planDescription: description,
      projection: confirmation,
    }
    projection = confirmation
    return { outcome: 'awaiting_approval', projection }
  }

  const returnToInput = (
    setupPlanId: string,
  ): SetupReconcileResult<SemesterSetupJourneyProjection> => {
    if (
      projection.state !== 'confirmation_required' ||
      projection.setupPlanId !== setupPlanId ||
      !draft ||
      draft.planDescription.setupPlanId !== setupPlanId
    ) {
      return { outcome: 'setup_conflict', projection }
    }
    return inputRequired()
  }

  const approve = async (
    setupPlanId: string,
  ): Promise<
    SetupReconcileResult<SemesterSetupJourneyProjection>
  > => {
    let observed = await options.stateStore.read()
    let approvedCommitted = false
    if (
      observed.status === 'absent' ||
      (observed.status === 'current' &&
        observed.envelope.state.kind === 'empty')
    ) {
      if (
        !draft ||
        draft.planDescription.setupPlanId !== setupPlanId
      ) {
        return blocked('setup_conflict')
      }
      const approved = approvedEnvelope(
        draft,
        createSetupId(),
        options.release,
      )
      const written = await options.stateStore.compareAndReplace({
        expectedRevisionToken: draft.expectedRevisionToken,
        envelope: approved,
      })
      if (written.status === 'conflict') {
        observed = await options.stateStore.read()
      } else {
        observed = {
          status: 'current',
          envelope: written.envelope,
          revisionToken: written.revisionToken,
        }
        approvedCommitted = true
      }
    }
    if (
      observed.status !== 'current' ||
      observed.envelope.state.kind !== 'pending' ||
      observed.envelope.state.receipt.setupPlanId !== setupPlanId
    ) {
      return observed.status === 'incompatible'
        ? blocked('setup_state_conflict')
        : blocked('setup_conflict')
    }
    if (observed.envelope.state.receipt.lifecycle.phase === 'prepared') {
      return validatePrepared(observed.envelope.state.receipt)
    }
    if (
      observed.envelope.state.receipt.lifecycle.phase !== 'approved'
    ) {
      return blocked('setup_conflict')
    }
    if (approvedCommitted) {
      await inject(options, 'after_approved_commit')
    }
    return prepareApproved(observed)
  }

  const prepareApproved = async (
    observed: Extract<
      Awaited<ReturnType<RecoverableSetupEnvelopeStore['read']>>,
      { status: 'current' }
    >,
    allowOwnedResume = false,
  ): Promise<
    SetupReconcileResult<SemesterSetupJourneyProjection>
  > => {
    const state = observed.envelope.state
    if (
      state.kind !== 'pending' ||
      state.receipt.lifecycle.phase !== 'approved'
    ) {
      return blocked('setup_state_conflict')
    }
    if (!sameRelease(state.receipt.release, options.release)) {
      return blocked('setup_release_mismatch')
    }
    projection = {
      state: 'working',
      stage: 'preparing_workspace',
    }
    const workspace = await reconcileWorkspace(
      state.receipt,
      createAdmission,
      allowOwnedResume,
    )
    if (!workspace) {
      return recovery(state.receipt.setupId, 'owned_incomplete')
    }
    await inject(options, 'after_workspace_admission')

    const sourceMatches =
      options.bundleSource.descriptorSha256 ===
        state.receipt.release.bundle.descriptorSha256 &&
      options.bundleSource.completeTreeSha256 ===
        state.receipt.release.bundle.completeTreeSha256
    if (!sourceMatches) return blocked('setup_release_mismatch')
    const materialized = await materializeWorkspaceBundle({
      workspace,
      source: options.bundleSource,
    })
    if (materialized.status === 'manual_recovery_required') {
      return recovery(state.receipt.setupId, 'bundle_conflict')
    }
    if (
      materialized.status === 'missing' ||
      materialized.status === 'source_invalid' ||
      materialized.status === 'unavailable'
    ) {
      return recovery(state.receipt.setupId, 'bundle_missing')
    }
    await inject(options, 'after_bundle_materialization')
    const bundle = await verifyWorkspaceBundle({
      workspace,
      source: options.bundleSource,
    })
    if (
      bundle.status !== 'verified' ||
      bundle.descriptorSha256 !==
        state.receipt.release.bundle.descriptorSha256 ||
      bundle.completeTreeSha256 !==
        state.receipt.release.bundle.completeTreeSha256
    ) {
      return bundle.status === 'missing'
        ? recovery(state.receipt.setupId, 'bundle_missing')
        : recovery(state.receipt.setupId, 'bundle_conflict')
    }
    const context = await verifyWorkspaceStaticContext(workspace)
    if (context.status !== 'verified') {
      return recovery(state.receipt.setupId, 'context_conflict')
    }
    if (
      !(await reopenReceiptWorkspace(
        state.receipt,
        createAdmission,
      ))
    ) {
      return blocked('setup_state_conflict')
    }
    projection = {
      state: 'working',
      stage: 'verifying_environment',
    }
    const prepared: SetupStateEnvelope = {
      formatVersion: 1,
      revision: observed.envelope.revision + 1,
      state: {
        kind: 'pending',
        receipt: {
          ...cloneReceipt(state.receipt),
          lifecycle: { phase: 'prepared' },
        },
      },
    }
    await inject(options, 'before_prepared_commit')
    const committed = await options.stateStore.compareAndReplace({
      expectedRevisionToken: observed.revisionToken,
      envelope: prepared,
    })
    if (committed.status === 'conflict') {
      const winner = await options.stateStore.read()
      if (
        winner.status !== 'current' ||
        winner.envelope.state.kind !== 'pending' ||
        winner.envelope.state.receipt.setupId !==
          state.receipt.setupId ||
        winner.envelope.state.receipt.lifecycle.phase !== 'prepared'
      ) {
        return blocked('setup_state_conflict')
      }
    } else if (
      committed.envelope.state.kind !== 'pending' ||
      committed.envelope.state.receipt.lifecycle.phase !== 'prepared'
    ) {
      return blocked('setup_state_conflict')
    }
    await inject(options, 'after_prepared_commit')
    if (!readyTransition) {
      return { outcome: 'resumed', projection }
    }
    const current = await options.stateStore.read()
    if (
      current.status !== 'current' ||
      current.envelope.state.kind !== 'pending' ||
      current.envelope.state.receipt.setupId !==
        state.receipt.setupId ||
      current.envelope.state.receipt.lifecycle.phase !== 'prepared'
    ) {
      return blocked('setup_state_conflict')
    }
    return validatePrepared(current.envelope.state.receipt)
  }

  const validatePrepared = async (
    receipt: PendingSetupReceipt,
    allowMissingRecovery = false,
  ): Promise<
    SetupReconcileResult<SemesterSetupJourneyProjection>
  > => {
    if (
      receipt.lifecycle.phase !== 'prepared' ||
      !sameRelease(receipt.release, options.release) ||
      !bundleSourceMatchesRelease(
        options.bundleSource,
        receipt.release,
      )
    ) {
      return blocked('setup_release_mismatch')
    }
    const workspace = await reopenReceiptWorkspace(
      receipt,
      createAdmission,
    )
    if (!workspace) {
      const admission = createAdmission()
      const inspection = await admission.inspect({
        kind: 'reopen',
        canonicalRoot: receipt.plan.target.canonicalTarget,
      })
      if (inspection.outcome === 'admitted') {
        return blocked('setup_state_conflict')
      }
      return recovery(receipt.setupId, 'owned_incomplete')
    }
    let bundle = await verifyWorkspaceBundle({
      workspace,
      source: options.bundleSource,
    })
    if (bundle.status === 'missing' && allowMissingRecovery) {
      await recoverMissingWorkspaceBundle({
        workspace,
        source: options.bundleSource,
      })
      bundle = await verifyWorkspaceBundle({
        workspace,
        source: options.bundleSource,
      })
    }
    if (bundle.status === 'missing') {
      return recovery(receipt.setupId, 'bundle_missing')
    }
    if (
      bundle.status !== 'verified' ||
      bundle.descriptorSha256 !==
        receipt.release.bundle.descriptorSha256 ||
      bundle.completeTreeSha256 !==
        receipt.release.bundle.completeTreeSha256
    ) {
      return recovery(receipt.setupId, 'bundle_conflict')
    }
    if (
      (await verifyWorkspaceStaticContext(workspace)).status !==
      'verified'
    ) {
      return recovery(receipt.setupId, 'context_conflict')
    }
    const rebound = await reopenReceiptWorkspace(
      receipt,
      createAdmission,
    )
    if (!rebound || !sameWorkspace(workspace, rebound)) {
      return blocked('setup_state_conflict')
    }
    projection = {
      state: 'working',
      stage: 'verifying_environment',
    }
    return readyTransition
      ? transitionPrepared(receipt, rebound)
      : { outcome: 'resumed', projection }
  }

  const resume = async (
    recoveryId: string,
  ): Promise<
    SetupReconcileResult<SemesterSetupJourneyProjection>
  > => {
    const observed = await options.stateStore.read()
    if (
      observed.status === 'current' &&
      observed.envelope.state.kind === 'active_ready' &&
      observed.envelope.state.pointer.setupId === recoveryId
    ) {
      return relaunchReady(observed.envelope.state.pointer, true)
    }
    if (
      observed.status !== 'current' ||
      observed.envelope.state.kind !== 'pending' ||
      observed.envelope.state.receipt.setupId !== recoveryId
    ) {
      return blocked('setup_conflict')
    }
    const receipt = observed.envelope.state.receipt
    if (receipt.lifecycle.phase === 'discard_requested') {
      return continueDiscard(observed)
    }
    if (receipt.lifecycle.phase === 'prepared') {
      return validatePrepared(receipt, true)
    }
    return prepareApproved(observed, true)
  }

  const transitionPrepared = async (
    receipt: PendingSetupReceipt,
    workspace: AdmittedSemesterWorkspace,
  ): Promise<
    SetupReconcileResult<SemesterSetupJourneyProjection>
  > => {
    const expected = readyPointer(receipt, workspace)
    return runReadyTransition({
      recoveryId: receipt.setupId,
      workspace,
      expected,
      successOutcome: 'ready_created',
      commitReady: () =>
        commitPreparedReady(receipt, workspace, expected),
      readReady: () => readExactReadyPointer(expected),
    })
  }

  const relaunchReady = async (
    pointer: ActiveReadyPointer,
    allowMissingRecovery = false,
  ): Promise<
    SetupReconcileResult<SemesterSetupJourneyProjection>
  > => {
    if (
      !sameRelease(pointer.release, options.release) ||
      !bundleSourceMatchesRelease(
        options.bundleSource,
        pointer.release,
      )
    ) {
      return blocked('setup_release_mismatch')
    }
    const admission = createAdmission()
    const inspection = await admission.inspect({
      kind: 'reopen',
      canonicalRoot: pointer.workspace.canonicalRoot,
    })
    if (
      (inspection.outcome !== 'admitted' &&
        inspection.outcome !== 'already_ready') ||
      !pointerMatchesWorkspace(pointer, inspection.workspace)
    ) {
      return blocked('setup_state_conflict')
    }
    const workspace = inspection.workspace
    let bundle = await verifyWorkspaceBundle({
      workspace,
      source: options.bundleSource,
    })
    if (bundle.status === 'missing' && allowMissingRecovery) {
      await recoverMissingWorkspaceBundle({
        workspace,
        source: options.bundleSource,
      })
      bundle = await verifyWorkspaceBundle({
        workspace,
        source: options.bundleSource,
      })
    }
    if (bundle.status === 'missing') {
      return recovery(pointer.setupId, 'bundle_missing')
    }
    if (
      bundle.status !== 'verified' ||
      bundle.descriptorSha256 !==
        pointer.release.bundle.descriptorSha256 ||
      bundle.completeTreeSha256 !==
        pointer.release.bundle.completeTreeSha256
    ) {
      return recovery(pointer.setupId, 'bundle_conflict')
    }
    if (
      (await verifyWorkspaceStaticContext(workspace)).status !==
      'verified'
    ) {
      return recovery(pointer.setupId, 'context_conflict')
    }
    const finalAdmission = createAdmission()
    const rebound = await finalAdmission.inspect({
      kind: 'reopen',
      canonicalRoot: pointer.workspace.canonicalRoot,
    })
    if (
      (rebound.outcome !== 'admitted' &&
        rebound.outcome !== 'already_ready') ||
      !sameWorkspace(workspace, rebound.workspace) ||
      !pointerMatchesWorkspace(pointer, rebound.workspace)
    ) {
      return blocked('setup_state_conflict')
    }
    projection = {
      state: 'working',
      stage: 'verifying_environment',
    }
    return runReadyTransition({
      recoveryId: pointer.setupId,
      workspace: rebound.workspace,
      expected: pointer,
      successOutcome: 'ready_relaunch',
      commitReady: () =>
        validateActiveReadyForCallback(pointer, rebound.workspace),
      readReady: () => readExactReadyPointer(pointer),
    })
  }

  const runReadyTransition = async (input: {
    readonly recoveryId: string
    readonly workspace: AdmittedSemesterWorkspace
    readonly expected: ActiveReadyPointer
    readonly successOutcome: 'ready_created' | 'ready_relaunch'
    readonly commitReady: () => Promise<ActiveReadyPointer>
    readonly readReady: () => Promise<ActiveReadyPointer>
  }): Promise<
    SetupReconcileResult<SemesterSetupJourneyProjection>
  > => {
    if (!readyTransition) {
      return blocked('setup_state_conflict')
    }
    let transitioned: SemesterReadyTransitionResult
    try {
      transitioned = await readyTransition.transition({
        workspace: input.workspace,
        expectedReady: input.expected,
        commitReady: input.commitReady,
        readReady: input.readReady,
      })
    } catch {
      return transitionBlocked(
        input.recoveryId,
        'setup_transition_unavailable',
        'resume',
      )
    }
    if (transitioned.status === 'ready') {
      if (!sameReadyPointer(transitioned.ready, input.expected)) {
        return blocked('setup_state_conflict')
      }
      return ready(
        input.successOutcome,
        input.recoveryId,
        input.workspace,
      )
    }
    if (transitioned.status === 'ready_commit_unknown') {
      return transitionBlocked(
        input.recoveryId,
        'setup_transition_unavailable',
        'resume',
      )
    }
    if (transitioned.status === 'reauth_required') {
      projection = {
        state: 'workspace_reauth',
        recoveryId: input.recoveryId,
      }
      return { outcome: 'reauth_required', projection }
    }
    if (transitioned.status === 'context_conflict') {
      return recovery(input.recoveryId, 'context_conflict')
    }
    if (transitioned.status === 'bundle_missing') {
      return recovery(input.recoveryId, 'bundle_missing')
    }
    if (transitioned.status === 'account_unavailable') {
      return transitionBlocked(
        input.recoveryId,
        'account_unavailable',
        'resume',
      )
    }
    if (transitioned.status === 'cancelled') {
      const blockedResult = transitionBlocked(
        input.recoveryId,
        'setup_transition_unavailable',
        'resume',
      )
      return {
        outcome: 'cancelled',
        projection: blockedResult.projection,
      }
    }
    return transitionBlocked(
      input.recoveryId,
      'setup_transition_unavailable',
      transitioned.retry,
    )
  }

  const commitPreparedReady = async (
    expectedReceipt: PendingSetupReceipt,
    expectedWorkspace: AdmittedSemesterWorkspace,
    expectedPointer: ActiveReadyPointer,
  ): Promise<ActiveReadyPointer> => {
    const observed = await options.stateStore.read()
    if (
      observed.status !== 'current' ||
      observed.envelope.state.kind !== 'pending' ||
      observed.envelope.state.receipt.lifecycle.phase !== 'prepared' ||
      !samePreparedReceipt(
        observed.envelope.state.receipt,
        expectedReceipt,
      ) ||
      !sameRelease(
        observed.envelope.state.receipt.release,
        options.release,
      )
    ) {
      throw new Error('Prepared setup authority changed before Ready commit')
    }
    const currentWorkspace = await reopenReceiptWorkspace(
      observed.envelope.state.receipt,
      createAdmission,
    )
    if (
      !currentWorkspace ||
      !sameWorkspace(currentWorkspace, expectedWorkspace) ||
      !pointerMatchesWorkspace(expectedPointer, currentWorkspace)
    ) {
      throw new Error('Prepared workspace binding changed before Ready commit')
    }
    const bundle = await verifyWorkspaceBundle({
      workspace: currentWorkspace,
      source: options.bundleSource,
    })
    if (bundle.status === 'missing') {
      throw new SemesterReadyValidationError('bundle_missing')
    }
    if (
      bundle.status !== 'verified' ||
      bundle.descriptorSha256 !==
        expectedPointer.release.bundle.descriptorSha256 ||
      bundle.completeTreeSha256 !==
        expectedPointer.release.bundle.completeTreeSha256 ||
      (await verifyWorkspaceStaticContext(currentWorkspace)).status !==
        'verified'
    ) {
      throw new Error('Prepared workspace changed before Ready commit')
    }
    const rebound = await reopenReceiptWorkspace(
      observed.envelope.state.receipt,
      createAdmission,
    )
    if (!rebound || !sameWorkspace(currentWorkspace, rebound)) {
      throw new Error('Prepared workspace changed before Ready commit')
    }
    const next: SetupStateEnvelope = {
      formatVersion: 1,
      revision: observed.envelope.revision + 1,
      state: {
        kind: 'active_ready',
        pointer: cloneReadyPointer(expectedPointer),
      },
    }
    await inject(options, 'before_ready_commit')
    const committed = await options.stateStore.compareAndReplace({
      expectedRevisionToken: observed.revisionToken,
      envelope: next,
    })
    if (committed.status === 'conflict') {
      return readExactReadyPointer(expectedPointer)
    }
    if (
      committed.envelope.state.kind !== 'active_ready' ||
      !sameReadyPointer(
        committed.envelope.state.pointer,
        expectedPointer,
      )
    ) {
      throw new Error('Ready commit did not return the exact pointer')
    }
    await inject(options, 'after_ready_commit')
    return readExactReadyPointer(expectedPointer)
  }

  const validateActiveReadyForCallback = async (
    expectedPointer: ActiveReadyPointer,
    expectedWorkspace: AdmittedSemesterWorkspace,
  ): Promise<ActiveReadyPointer> => {
    await readExactReadyPointer(expectedPointer)
    const admission = createAdmission()
    const inspection = await admission.inspect({
      kind: 'reopen',
      canonicalRoot: expectedPointer.workspace.canonicalRoot,
    })
    if (
      (inspection.outcome !== 'admitted' &&
        inspection.outcome !== 'already_ready') ||
      !sameWorkspace(inspection.workspace, expectedWorkspace) ||
      !pointerMatchesWorkspace(expectedPointer, inspection.workspace)
    ) {
      throw new SemesterReadyValidationError()
    }
    const bundle = await verifyWorkspaceBundle({
      workspace: inspection.workspace,
      source: options.bundleSource,
    })
    if (bundle.status === 'missing') {
      throw new SemesterReadyValidationError('bundle_missing')
    }
    if (
      bundle.status !== 'verified' ||
      bundle.descriptorSha256 !==
        expectedPointer.release.bundle.descriptorSha256 ||
      bundle.completeTreeSha256 !==
        expectedPointer.release.bundle.completeTreeSha256 ||
      (await verifyWorkspaceStaticContext(inspection.workspace))
        .status !== 'verified'
    ) {
      throw new SemesterReadyValidationError()
    }
    const finalAdmission = createAdmission()
    const rebound = await finalAdmission.inspect({
      kind: 'reopen',
      canonicalRoot: expectedPointer.workspace.canonicalRoot,
    })
    if (
      (rebound.outcome !== 'admitted' &&
        rebound.outcome !== 'already_ready') ||
      !sameWorkspace(rebound.workspace, expectedWorkspace) ||
      !pointerMatchesWorkspace(expectedPointer, rebound.workspace)
    ) {
      throw new SemesterReadyValidationError()
    }
    return readExactReadyPointer(expectedPointer)
  }

  const readExactReadyPointer = async (
    expected: ActiveReadyPointer,
  ): Promise<ActiveReadyPointer> => {
    const observed = await options.stateStore.read()
    if (
      observed.status !== 'current' ||
      observed.envelope.state.kind !== 'active_ready' ||
      !sameReadyPointer(observed.envelope.state.pointer, expected)
    ) {
      throw new Error('The exact Ready pointer is not durable')
    }
    return cloneReadyPointer(observed.envelope.state.pointer)
  }

  const discard = async (
    recoveryId: string,
  ): Promise<
    SetupReconcileResult<SemesterSetupJourneyProjection>
  > => {
    let observed = await options.stateStore.read()
    if (
      observed.status !== 'current' ||
      observed.envelope.state.kind !== 'pending' ||
      observed.envelope.state.receipt.setupId !== recoveryId
    ) {
      return blocked('setup_conflict')
    }
    let receipt = observed.envelope.state.receipt
    if (receipt.lifecycle.phase === 'prepared') {
      return blocked('setup_conflict')
    }
    if (receipt.lifecycle.phase === 'approved') {
      const admission = createAdmission()
      const inspection = await admission.inspect({
        kind: 'discard_owned',
        setupId: receipt.setupPlanId,
        canonicalRoot: receipt.plan.target.canonicalTarget,
      })
      if (inspection.outcome !== 'owned_incomplete') {
        return recovery(receipt.setupId, 'owned_incomplete')
      }
      if (
        !(await admission.verifyBinding(
          receiptDescription(receipt),
          {
            kind: 'plan',
            plan: inspection.plan,
          },
        ))
      ) {
        return blocked('setup_state_conflict')
      }
      const rootIdentity = await readRootIdentity(
        receipt.plan.target.canonicalTarget,
      )
      if (!rootIdentity) {
        return recovery(receipt.setupId, 'owned_incomplete')
      }
      const discardRequested: SetupStateEnvelope = {
        formatVersion: 1,
        revision: observed.envelope.revision + 1,
        state: {
          kind: 'pending',
          receipt: {
            ...cloneReceipt(receipt),
            lifecycle: {
              phase: 'discard_requested',
              rootFileIdentity: rootIdentity,
            },
          },
        },
      }
      const committed = await options.stateStore.compareAndReplace({
        expectedRevisionToken: observed.revisionToken,
        envelope: discardRequested,
      })
      if (committed.status === 'conflict') {
        return blocked('setup_state_conflict')
      }
      observed = {
        status: 'current',
        envelope: committed.envelope,
        revisionToken: committed.revisionToken,
      }
      if (
        observed.envelope.state.kind !== 'pending' ||
        observed.envelope.state.receipt.lifecycle.phase !==
          'discard_requested'
      ) {
        return blocked('setup_state_conflict')
      }
      receipt = observed.envelope.state.receipt
      await inject(options, 'after_discard_intent_commit')
    }
    return continueDiscard(observed)
  }

  const continueDiscard = async (
    observed: Extract<
      Awaited<ReturnType<RecoverableSetupEnvelopeStore['read']>>,
      { status: 'current' }
    >,
  ): Promise<
    SetupReconcileResult<SemesterSetupJourneyProjection>
  > => {
    const state = observed.envelope.state
    if (
      state.kind !== 'pending' ||
      state.receipt.lifecycle.phase !== 'discard_requested'
    ) {
      return blocked('setup_state_conflict')
    }
    const receipt = state.receipt
    const lifecycle = receipt.lifecycle
    if (lifecycle.phase !== 'discard_requested') {
      return blocked('setup_state_conflict')
    }
    const root = receipt.plan.target.canonicalTarget
    const admission = createAdmission()
    const inspection = await admission.inspect({
      kind: 'discard_owned',
      setupId: receipt.setupPlanId,
      canonicalRoot: root,
    })
    if (inspection.outcome === 'owned_incomplete') {
      if (
        !(await admission.verifyBinding(
          receiptDescription(receipt),
          {
            kind: 'plan',
            plan: inspection.plan,
          },
        ))
      ) {
        return blocked('setup_state_conflict')
      }
      const result = await admission.apply(inspection.plan)
      if (result.outcome !== 'discarded') {
        return recovery(receipt.setupId, 'owned_incomplete')
      }
    } else if (
      !(await finishMarkerlessDiscard(
        root,
        receipt.plan.target,
        lifecycle.rootFileIdentity,
      ))
    ) {
      return recovery(receipt.setupId, 'owned_incomplete')
    }
    await inject(options, 'after_workspace_discard')
    await inject(options, 'before_empty_commit')
    const empty: SetupStateEnvelope = {
      formatVersion: 1,
      revision: observed.envelope.revision + 1,
      state: { kind: 'empty' },
    }
    const committed = await options.stateStore.compareAndReplace({
      expectedRevisionToken: observed.revisionToken,
      envelope: empty,
    })
    if (committed.status === 'conflict') {
      const winner = await options.stateStore.read()
      if (
        winner.status !== 'current' ||
        winner.envelope.state.kind !== 'empty'
      ) {
        return blocked('setup_state_conflict')
      }
    }
    await inject(options, 'after_empty_commit')
    return inputRequired('discarded')
  }

  const inputRequired = (
    outcome: 'awaiting_input' | 'discarded' = 'awaiting_input',
  ): SetupReconcileResult<SemesterSetupJourneyProjection> => {
    draft = undefined
    projection = { state: 'input_required' }
    return { outcome, projection }
  }

  const blocked = (
    reason: Extract<
      SemesterSetupJourneyProjection,
      { state: 'blocked' }
    >['reason'],
  ): SetupReconcileResult<SemesterSetupJourneyProjection> => {
    projection = { state: 'blocked', reason }
    return {
      outcome:
        reason === 'setup_release_mismatch'
          ? 'setup_release_mismatch'
          : reason,
      projection,
    }
  }

  const recovery = (
    recoveryId: string,
    reason: Extract<
      SemesterSetupJourneyProjection,
      { state: 'recovery_required' }
    >['reason'],
  ): SetupReconcileResult<SemesterSetupJourneyProjection> => {
    projection = { state: 'recovery_required', recoveryId, reason }
    return {
      outcome: 'recovery_required',
      projection,
    }
  }

  const transitionBlocked = (
    recoveryId: string,
    reason: Extract<
      SemesterSetupJourneyProjection,
      { state: 'transition_blocked' }
    >['reason'],
    retry: 'resume' | 'restart_required',
  ): SetupReconcileResult<SemesterSetupJourneyProjection> => {
    projection =
      retry === 'resume'
        ? {
            state: 'transition_blocked',
            reason,
            retry,
            recoveryId,
          }
        : {
            state: 'transition_blocked',
            reason: 'setup_transition_unavailable',
            retry,
          }
    return {
      outcome:
        reason === 'account_unavailable'
          ? 'account_unavailable'
          : 'setup_transition_unavailable',
      projection,
    }
  }

  const ready = (
    outcome: 'ready_created' | 'ready_relaunch',
    recoveryId: string,
    workspace: AdmittedSemesterWorkspace,
  ): SetupReconcileResult<SemesterSetupJourneyProjection> => {
    projection = {
      state: 'ready',
      recoveryId,
      workspace: cloneAdmittedWorkspace(workspace),
    }
    return { outcome, projection }
  }

  return {
    reconcile,
    observe(): SemesterSetupJourneyProjection {
      return cloneProjection(projection)
    },
  }
}

async function reconcileWorkspace(
  receipt: PendingSetupReceipt,
  createAdmission: () => RestorableSemesterWorkspaceAdmission,
  allowOwnedResume: boolean,
): Promise<AdmittedSemesterWorkspace | null> {
  const description = receiptDescription(receipt)
  let admission = createAdmission()
  const restored = await admission.restore(description)
  if (restored) {
    const created = await admission.apply(restored)
    if (
      created.outcome !== 'created' &&
      created.outcome !== 'resumed'
    ) {
      admission = createAdmission()
    } else if (
      !(await admission.verifyBinding(description, {
        kind: 'workspace',
        workspace: created.workspace,
      }))
    ) {
      return null
    }
  }
  admission = createAdmission()
  let reopened = await admission.inspect({
    kind: 'reopen',
    canonicalRoot: receipt.plan.target.canonicalTarget,
  })
  if (reopened.outcome === 'admitted') {
    return (await admission.verifyBinding(description, {
      kind: 'workspace',
      workspace: reopened.workspace,
    }))
      ? reopened.workspace
      : null
  }

  const resumable = await admission.inspect({
    kind: 'resume_owned',
    setupId: receipt.setupPlanId,
    canonicalRoot: receipt.plan.target.canonicalTarget,
  })
  if (resumable.outcome === 'owned_incomplete') {
    if (!allowOwnedResume) return null
    if (
      !(await admission.verifyBinding(description, {
        kind: 'plan',
        plan: resumable.plan,
      }))
    ) {
      return null
    }
    const resumed = await admission.apply(resumable.plan)
    if (
      resumed.outcome !== 'resumed' ||
      !(await admission.verifyBinding(description, {
        kind: 'workspace',
        workspace: resumed.workspace,
      }))
    ) {
      return null
    }
  } else if (resumable.outcome === 'admitted') {
    return (await admission.verifyBinding(description, {
      kind: 'workspace',
      workspace: resumable.workspace,
    }))
      ? resumable.workspace
      : null
  }
  admission = createAdmission()
  reopened = await admission.inspect({
    kind: 'reopen',
    canonicalRoot: receipt.plan.target.canonicalTarget,
  })
  return reopened.outcome === 'admitted' &&
    (await admission.verifyBinding(description, {
      kind: 'workspace',
      workspace: reopened.workspace,
    }))
    ? reopened.workspace
    : null
}

async function reopenReceiptWorkspace(
  receipt: PendingSetupReceipt,
  createAdmission: () => RestorableSemesterWorkspaceAdmission,
): Promise<AdmittedSemesterWorkspace | null> {
  const admission = createAdmission()
  const inspection = await admission.inspect({
    kind: 'reopen',
    canonicalRoot: receipt.plan.target.canonicalTarget,
  })
  if (inspection.outcome !== 'admitted') return null
  return (await admission.verifyBinding(receiptDescription(receipt), {
    kind: 'workspace',
    workspace: inspection.workspace,
  }))
    ? inspection.workspace
    : null
}

function approvedEnvelope(
  draft: PreparedDraft,
  setupId: string,
  release: LaunchBinding,
): SetupStateEnvelope {
  const binding = draft.planDescription.privateBinding
  return {
    formatVersion: 1,
    revision: draft.nextRevision,
    state: {
      kind: 'pending',
      receipt: {
        setupId,
        setupPlanId: draft.planDescription.setupPlanId,
        lifecycle: { phase: 'approved' },
        plan: {
          canonicalBytesSha256: binding.plan.canonicalBytesSha256,
          semester: {
            yearLevel: binding.plan.semester.yearLevel,
            term: { ...binding.plan.semester.term },
          },
          target: { ...binding.plan.target },
        },
        release: cloneRelease(release),
        workspace: { ...binding.workspace },
      },
    },
  }
}

function receiptDescription(
  receipt: PendingSetupReceipt,
): WorkspaceAdmissionPlanDescription {
  return {
    setupPlanId: receipt.setupPlanId,
    privateBinding: {
      plan: {
        canonicalBytesSha256: receipt.plan.canonicalBytesSha256,
        semester: {
          yearLevel: receipt.plan.semester.yearLevel,
          term: { ...receipt.plan.semester.term },
        },
        target: { ...receipt.plan.target },
      },
      workspace: { ...receipt.workspace },
    },
  }
}

function cloneReceipt(
  receipt: PendingSetupReceipt,
): PendingSetupReceipt {
  return {
    setupId: receipt.setupId,
    setupPlanId: receipt.setupPlanId,
    lifecycle:
      receipt.lifecycle.phase === 'discard_requested'
        ? {
            phase: 'discard_requested',
            rootFileIdentity: {
              ...receipt.lifecycle.rootFileIdentity,
            },
          }
        : { phase: receipt.lifecycle.phase },
    plan: {
      canonicalBytesSha256: receipt.plan.canonicalBytesSha256,
      semester: {
        yearLevel: receipt.plan.semester.yearLevel,
        term: { ...receipt.plan.semester.term },
      },
      target: { ...receipt.plan.target },
    },
    release: cloneRelease(receipt.release),
    workspace: { ...receipt.workspace },
  }
}

function cloneRelease(release: LaunchBinding): LaunchBinding {
  return {
    application: { ...release.application },
    runtime: { ...release.runtime },
    bundle: { ...release.bundle },
  }
}

function readyPointer(
  receipt: PendingSetupReceipt,
  workspace: AdmittedSemesterWorkspace,
): ActiveReadyPointer {
  return {
    setupId: receipt.setupId,
    release: cloneRelease(receipt.release),
    workspace: {
      canonicalRoot: workspace.canonicalRoot,
      workspaceId: workspace.workspaceId,
      formatVersion: 3,
    },
  }
}

function cloneReadyPointer(
  pointer: ActiveReadyPointer,
): ActiveReadyPointer {
  return {
    setupId: pointer.setupId,
    release: cloneRelease(pointer.release),
    workspace: { ...pointer.workspace },
  }
}

function cloneAdmittedWorkspace(
  workspace: AdmittedSemesterWorkspace,
): AdmittedSemesterWorkspace {
  return {
    canonicalRoot: workspace.canonicalRoot,
    workspaceId: workspace.workspaceId,
    formatVersion: 3,
    manifest: {
      workspaceId: workspace.manifest.workspaceId,
      semester: {
        yearLevel: workspace.manifest.semester.yearLevel,
        term: { ...workspace.manifest.semester.term },
      },
      courses: [],
    },
  }
}

function samePreparedReceipt(
  left: PendingSetupReceipt,
  right: PendingSetupReceipt,
): boolean {
  return (
    left.lifecycle.phase === 'prepared' &&
    right.lifecycle.phase === 'prepared' &&
    JSON.stringify(cloneReceipt(left)) ===
      JSON.stringify(cloneReceipt(right))
  )
}

function sameWorkspace(
  left: AdmittedSemesterWorkspace,
  right: AdmittedSemesterWorkspace,
): boolean {
  return (
    left.canonicalRoot === right.canonicalRoot &&
    left.workspaceId === right.workspaceId &&
    left.formatVersion === 3 &&
    right.formatVersion === 3 &&
    left.workspaceId === left.manifest.workspaceId &&
    right.workspaceId === right.manifest.workspaceId &&
    left.manifest.semester.yearLevel ===
      right.manifest.semester.yearLevel &&
    left.manifest.semester.term.key ===
      right.manifest.semester.term.key &&
    left.manifest.semester.term.displayName ===
      right.manifest.semester.term.displayName &&
    left.manifest.courses.length === 0 &&
    right.manifest.courses.length === 0
  )
}

function pointerMatchesWorkspace(
  pointer: ActiveReadyPointer,
  workspace: AdmittedSemesterWorkspace,
): boolean {
  return (
    pointer.workspace.canonicalRoot === workspace.canonicalRoot &&
    pointer.workspace.workspaceId === workspace.workspaceId &&
    pointer.workspace.formatVersion === 3 &&
    workspace.formatVersion === 3 &&
    workspace.manifest.workspaceId === workspace.workspaceId
  )
}

function sameReadyPointer(
  left: ActiveReadyPointer,
  right: ActiveReadyPointer,
): boolean {
  return (
    left.setupId === right.setupId &&
    sameRelease(left.release, right.release) &&
    left.workspace.canonicalRoot === right.workspace.canonicalRoot &&
    left.workspace.workspaceId === right.workspace.workspaceId &&
    left.workspace.formatVersion === 3 &&
    right.workspace.formatVersion === 3
  )
}

function sameRelease(left: LaunchBinding, right: LaunchBinding): boolean {
  return (
    left.application.packageName === right.application.packageName &&
    left.application.packageVersion ===
      right.application.packageVersion &&
    left.runtime.releaseDescriptorSha256 ===
      right.runtime.releaseDescriptorSha256 &&
    left.runtime.manifestSha256 === right.runtime.manifestSha256 &&
    left.runtime.releaseId === right.runtime.releaseId &&
    left.runtime.target === right.runtime.target &&
    left.runtime.runtimeContractVersion ===
      right.runtime.runtimeContractVersion &&
    left.bundle.descriptorSha256 ===
      right.bundle.descriptorSha256 &&
    left.bundle.completeTreeSha256 ===
      right.bundle.completeTreeSha256
  )
}

function bundleSourceMatchesRelease(
  source: VerifiedBundleSource,
  release: LaunchBinding,
): boolean {
  return (
    source.descriptorSha256 === release.bundle.descriptorSha256 &&
    source.completeTreeSha256 ===
      release.bundle.completeTreeSha256
  )
}

async function readRootIdentity(
  root: string,
): Promise<{
  readonly device: string
  readonly inode: string
  readonly birthtimeNs: string
} | null> {
  try {
    const stats = await lstat(root, { bigint: true })
    if (
      !stats.isDirectory() ||
      stats.isSymbolicLink() ||
      (await realpath(root)) !== root
    ) {
      return null
    }
    return {
      device: stats.dev.toString(),
      inode: stats.ino.toString(),
      birthtimeNs: stats.birthtimeNs.toString(),
    }
  } catch {
    return null
  }
}

async function finishMarkerlessDiscard(
  root: string,
  target: PendingSetupReceipt['plan']['target'],
  expected: {
    readonly device: string
    readonly inode: string
    readonly birthtimeNs: string
  },
): Promise<boolean> {
  const parent = target.canonicalParent
  if (
    root !== target.canonicalTarget ||
    path.dirname(root) !== parent ||
    path.basename(root) !== target.leafName ||
    !(await isCurrentParentAuthority(target))
  ) {
    return false
  }
  const current = await readRootIdentity(root)
  if (!current) {
    try {
      await lstat(root)
      return false
    } catch (error) {
      return hasErrnoCode(error, 'ENOENT')
    }
  }
  if (
    current.device !== expected.device ||
    current.inode !== expected.inode ||
    current.birthtimeNs !== expected.birthtimeNs
  ) {
    return false
  }
  let entries = (await readdir(root)).sort()
  if (
    entries.length === 1 &&
    entries[0] === '.ay-ple'
  ) {
    const product = path.join(root, '.ay-ple')
    const stats = await lstat(product)
    if (
      !stats.isDirectory() ||
      stats.isSymbolicLink() ||
      (await readdir(product)).length !== 0
    ) {
      return false
    }
    await rmdir(product)
    entries = await readdir(root)
  }
  if (entries.length !== 0) return false
  if (!(await isCurrentParentAuthority(target))) return false
  const rebound = await readRootIdentity(root)
  if (
    !rebound ||
    rebound.device !== expected.device ||
    rebound.inode !== expected.inode ||
    rebound.birthtimeNs !== expected.birthtimeNs
  ) {
    return false
  }
  await rmdir(root)
  if (!(await isCurrentParentAuthority(target))) return false
  await syncDirectory(parent)
  return true
}

async function isCurrentParentAuthority(
  target: PendingSetupReceipt['plan']['target'],
): Promise<boolean> {
  try {
    const [canonicalParent, stats] = await Promise.all([
      realpath(target.canonicalParent),
      lstat(target.canonicalParent, { bigint: true }),
    ])
    return (
      canonicalParent === target.canonicalParent &&
      stats.isDirectory() &&
      !stats.isSymbolicLink() &&
      stats.dev.toString() === target.parentDevice &&
      stats.ino.toString() === target.parentInode
    )
  } catch {
    return false
  }
}

async function syncDirectory(directory: string): Promise<void> {
  const handle = await open(directory, fsConstants.O_RDONLY)
  try {
    await handle.sync()
  } finally {
    await handle.close()
  }
}

function cloneProjection(
  projection: SemesterSetupJourneyProjection,
): SemesterSetupJourneyProjection {
  return JSON.parse(JSON.stringify(projection)) as SemesterSetupJourneyProjection
}

async function inject(
  options: SemesterSetupJourneyOptions,
  point: SemesterSetupJourneyFaultPoint,
): Promise<void> {
  await options.fault?.(point)
}

function hasErrnoCode(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === code
  )
}
