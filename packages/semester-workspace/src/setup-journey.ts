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
      return blocked('setup_state_conflict')
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
    return { outcome: 'resumed', projection }
  }

  const validatePrepared = async (
    receipt: PendingSetupReceipt,
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
    const admission = createAdmission()
    const inspection = await admission.inspect({
      kind: 'reopen',
      canonicalRoot: receipt.plan.target.canonicalTarget,
    })
    if (inspection.outcome !== 'admitted') {
      return recovery(receipt.setupId, 'owned_incomplete')
    }
    const bundle = await verifyWorkspaceBundle({
      workspace: inspection.workspace,
      source: options.bundleSource,
    })
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
      (await verifyWorkspaceStaticContext(inspection.workspace))
        .status !== 'verified'
    ) {
      return recovery(receipt.setupId, 'context_conflict')
    }
    projection = {
      state: 'working',
      stage: 'verifying_environment',
    }
    return { outcome: 'resumed', projection }
  }

  const resume = async (
    recoveryId: string,
  ): Promise<
    SetupReconcileResult<SemesterSetupJourneyProjection>
  > => {
    const observed = await options.stateStore.read()
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
      return validatePrepared(receipt)
    }
    return prepareApproved(observed, true)
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
    }
  }
  admission = createAdmission()
  let reopened = await admission.inspect({
    kind: 'reopen',
    canonicalRoot: receipt.plan.target.canonicalTarget,
  })
  if (reopened.outcome === 'admitted') return reopened.workspace

  const resumable = await admission.inspect({
    kind: 'resume_owned',
    setupId: receipt.setupPlanId,
    canonicalRoot: receipt.plan.target.canonicalTarget,
  })
  if (resumable.outcome === 'owned_incomplete') {
    if (!allowOwnedResume) return null
    await admission.apply(resumable.plan)
  } else if (resumable.outcome === 'admitted') {
    return resumable.workspace
  }
  admission = createAdmission()
  reopened = await admission.inspect({
    kind: 'reopen',
    canonicalRoot: receipt.plan.target.canonicalTarget,
  })
  return reopened.outcome === 'admitted' ? reopened.workspace : null
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
