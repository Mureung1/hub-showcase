/// <reference types="node" />

import { createHash, createHmac, randomUUID } from 'node:crypto'
import { constants as fsConstants } from 'node:fs'
import {
  access,
  link,
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rmdir,
  unlink,
} from 'node:fs/promises'
import path from 'node:path'

import type {
  AdmittedSemesterWorkspace,
  AuthorityBoundWorkspacePlan,
  SemesterIdentity,
  SemesterWorkspaceAdmission,
  SemesterWorkspaceV3,
  WorkspaceApplyResult,
  WorkspaceAdmissionPlanDescription,
  WorkspaceInspection,
  WorkspaceIntent,
  WorkspaceManifest,
  WorkspaceParentAuthority,
} from './contract.js'
import {
  classifySemesterWorkspaceStateBytes,
  createInitialSemesterWorkspaceV3,
  decodeSemesterWorkspaceV3Bytes,
  encodeSemesterWorkspaceV3,
  isSemesterIdentity,
  isWorkspaceId,
} from './v3-codec.js'

const productDirectoryName = '.ay-ple'
const stateFileName = 'workspace-state.json'
const evidenceFileName = '.workspace-admission.json'
const directoryMode = 0o700
const fileMode = 0o600
const leafNameMaxBytes = 255
const opaqueIdentityMaxBytes = 512
const admissionMarkerMaxBytes = 1024 * 1024
const evidenceKind = 'ay-ple.workspace-admission-evidence'

type WorkspaceAdmissionFaultPoint =
  | 'before_root_reservation'
  | 'after_root_reservation'
  | 'after_marker_create'
  | 'after_marker_write'
  | 'after_marker_file_sync'
  | 'after_marker_directory_sync'
  | 'after_inbox_directory_create'
  | 'after_courses_directory_create'
  | 'after_required_directories'
  | 'after_state_temp_create'
  | 'after_state_temp_write'
  | 'after_state_temp_file_sync'
  | 'before_state_publish'
  | 'after_state_publish'
  | 'after_state_directory_sync'
  | 'after_state_temp_unlink'
  | 'after_state_temp_unlink_directory_sync'
  | 'before_state_readback'
  | 'after_state_readback'
  | 'before_evidence_unlink'
  | 'after_evidence_unlink'
  | 'after_evidence_directory_sync'
  | 'after_discard_state_temp_unlink'
  | 'after_discard_courses_remove'
  | 'after_discard_inbox_remove'
  | 'after_discard_marker_unlink'
  | 'after_discard_product_root_remove'
  | 'after_discard_root_remove'

type SemesterWorkspaceAdmissionTestOptions = {
  readonly fault?: (
    point: WorkspaceAdmissionFaultPoint,
  ) => void | Promise<void>
}

type FileIdentity = {
  readonly device: string
  readonly inode: string
  readonly birthtimeNs: string
}

type OwnedScaffoldPlan = {
  readonly formatVersion: 1
  readonly directories: readonly [
    typeof productDirectoryName,
    'courses',
    'inbox',
  ]
  readonly state: {
    readonly relativePath: '.ay-ple/workspace-state.json'
    readonly temporaryRelativePath: string
    readonly bytes: number
    readonly sha256: string
  }
}

type AdmissionAuthority = {
  readonly setupNonce: string
  readonly operation: 'create'
  readonly canonicalRoot: string
  readonly parent: WorkspaceParentAuthority
  readonly leafName: string
  readonly workspaceId: string
  readonly aggregateBytesBase64: string
  readonly aggregateSha256: string
  readonly ownedScaffoldPlan: OwnedScaffoldPlan
  readonly ownedScaffoldPlanSha256: string
}

type AdmissionEvidence = {
  readonly kind: typeof evidenceKind
  readonly formatVersion: 3
  readonly setupPlanBinding: string
  readonly authorityDigest: string
  readonly authority: AdmissionAuthority
}

type DecodedAdmissionEvidence = {
  readonly setupPlanId: string
  readonly evidence: AdmissionEvidence
  readonly markerBytes: Buffer
  readonly markerSha256: string
  readonly aggregate: SemesterWorkspaceV3
  readonly aggregateBytes: Buffer
}

type OwnedRuntimeAuthority = {
  readonly parent: WorkspaceParentAuthority
  readonly rootIdentity: FileIdentity
}

type CreatePlanContext = {
  readonly kind: 'create'
  readonly plan: AuthorityBoundWorkspacePlan
  readonly planned: DecodedAdmissionEvidence
}

type ResumePlanContext = {
  readonly kind: 'resume_owned'
  readonly plan: AuthorityBoundWorkspacePlan
  readonly planned: DecodedAdmissionEvidence
  readonly runtimeAuthority: OwnedRuntimeAuthority
}

type DiscardPlanContext = {
  readonly kind: 'discard_owned'
  readonly plan: AuthorityBoundWorkspacePlan
  readonly planned: DecodedAdmissionEvidence
  readonly runtimeAuthority: OwnedRuntimeAuthority
}

type PlanContext =
  | CreatePlanContext
  | ResumePlanContext
  | DiscardPlanContext

export interface RestorableSemesterWorkspaceAdmission
  extends SemesterWorkspaceAdmission {
  restore(
    description: WorkspaceAdmissionPlanDescription,
  ): Promise<AuthorityBoundWorkspacePlan | null>
  verifyBinding(
    description: WorkspaceAdmissionPlanDescription,
    subject:
      | {
          readonly kind: 'plan'
          readonly plan: AuthorityBoundWorkspacePlan
        }
      | {
          readonly kind: 'workspace'
          readonly workspace: AdmittedSemesterWorkspace
        },
  ): Promise<boolean>
}

type WorkspaceAdmissionPlanEvidenceForTesting = {
  readonly plan: AuthorityBoundWorkspacePlan
  readonly description: WorkspaceAdmissionPlanDescription
  readonly authorityDigest: string
  readonly markerBytesBase64: string
  readonly aggregateBytesBase64: string
}

const admissionPlanContexts = new WeakMap<
  RestorableSemesterWorkspaceAdmission,
  Map<string, PlanContext>
>()

type RootClassification =
  | {
      readonly status: 'current_v3'
      readonly workspace: AdmittedSemesterWorkspace
      readonly hasEvidence: boolean
    }
  | { readonly status: 'legacy_v2' }
  | { readonly status: 'incompatible' }
  | { readonly status: 'collision' }
  | { readonly status: 'unsafe' }
  | { readonly status: 'unavailable' }

export function createSemesterWorkspaceAdmission(
): RestorableSemesterWorkspaceAdmission {
  return createSemesterWorkspaceAdmissionModule({})
}

export function createSemesterWorkspaceAdmissionForTesting(
  options: SemesterWorkspaceAdmissionTestOptions,
): RestorableSemesterWorkspaceAdmission {
  return createSemesterWorkspaceAdmissionModule(options)
}

function createSemesterWorkspaceAdmissionModule(
  options: SemesterWorkspaceAdmissionTestOptions,
): RestorableSemesterWorkspaceAdmission {
  const plans = new Map<string, PlanContext>()

  const admission: RestorableSemesterWorkspaceAdmission = {
    async inspect(intent): Promise<WorkspaceInspection> {
      if (!intent || typeof intent !== 'object') {
        return { outcome: 'unsafe', readOnly: false }
      }
      switch (intent.kind) {
        case 'create':
          return inspectCreate(intent, plans)
        case 'reopen':
          return inspectReopen(intent.canonicalRoot)
        case 'resume_owned':
          return inspectOwnedResume(intent, plans)
        case 'discard_owned':
          return inspectOwnedDiscard(intent, plans)
        default:
          return { outcome: 'unsafe', readOnly: false }
      }
    },

    describe(
      plan: AuthorityBoundWorkspacePlan,
    ): WorkspaceAdmissionPlanDescription | null {
      const context = plans.get(plan.planId)
      if (
        !context ||
        context.kind !== 'create' ||
        !samePlan(context.plan, plan)
      ) {
        return null
      }
      return describeCreatePlan(context)
    },

    async restore(
      description: WorkspaceAdmissionPlanDescription,
    ): Promise<AuthorityBoundWorkspacePlan | null> {
      return restoreCreatePlan(description, plans)
    },

    async verifyBinding(
      description,
      subject,
    ): Promise<boolean> {
      return verifyAdmissionBinding(description, subject, plans)
    },

    async apply(plan): Promise<WorkspaceApplyResult> {
      const context = plans.get(plan.planId)
      if (!context || !samePlan(context.plan, plan)) {
        return { outcome: 'authority_changed' }
      }
      try {
        if (context.kind === 'create') {
          return await applyCreate(context, options)
        }
        if (context.kind === 'discard_owned') {
          return await applyDiscard(context, options)
        }
        return await applyResume(context, options)
      } catch (error) {
        if (error instanceof InjectedAdmissionFault) throw error.cause
        if (error instanceof ApplyFailure) {
          return { outcome: error.outcome }
        }
        return { outcome: 'unavailable' }
      }
    },
  }
  admissionPlanContexts.set(admission, plans)
  return admission
}

export function readWorkspaceAdmissionPlanEvidenceForTesting(
  admission: RestorableSemesterWorkspaceAdmission,
  plan: AuthorityBoundWorkspacePlan,
): WorkspaceAdmissionPlanEvidenceForTesting {
  const context = admissionPlanContexts.get(admission)?.get(plan.planId)
  if (
    !context ||
    context.kind !== 'create' ||
    !samePlan(context.plan, plan)
  ) {
    throw new TypeError('Unknown workspace admission plan.')
  }
  return {
    plan: cloneAuthorityBoundWorkspacePlan(context.plan),
    description: describeCreatePlan(context),
    authorityDigest: context.planned.evidence.authorityDigest,
    markerBytesBase64: context.planned.markerBytes.toString('base64'),
    aggregateBytesBase64:
      context.planned.aggregateBytes.toString('base64'),
  }
}

function describeCreatePlan(
  context: CreatePlanContext,
): WorkspaceAdmissionPlanDescription {
  return describePlannedAdmission(context.planned)
}

function describePlannedAdmission(
  planned: DecodedAdmissionEvidence,
): WorkspaceAdmissionPlanDescription {
  const { authority } = planned.evidence
  const semester = cloneSemesterIdentity(
    planned.aggregate.manifest.semester,
  )
  const target = {
    canonicalParent: authority.parent.canonicalParent,
    parentDevice: authority.parent.parentDevice,
    parentInode: authority.parent.parentInode,
    leafName: authority.leafName,
    canonicalTarget: authority.canonicalRoot,
  }
  return {
    setupPlanId: planned.setupPlanId,
    privateBinding: {
      plan: {
        canonicalBytesSha256: sha256Canonical({
          semester,
          target,
        }),
        semester,
        target: { ...target },
      },
      workspace: {
        workspaceId: authority.workspaceId,
        formatVersion: 3,
        rootMarkerSha256: planned.markerSha256,
        ownedScaffoldPlanSha256: authority.ownedScaffoldPlanSha256,
        expectedInitialAggregateSha256: authority.aggregateSha256,
      },
    },
  }
}

async function verifyAdmissionBinding(
  description: WorkspaceAdmissionPlanDescription,
  subject:
    | {
        readonly kind: 'plan'
        readonly plan: AuthorityBoundWorkspacePlan
      }
    | {
        readonly kind: 'workspace'
        readonly workspace: AdmittedSemesterWorkspace
      },
  plans: Map<string, PlanContext>,
): Promise<boolean> {
  const decoded = decodeRestorablePlanDescription(description)
  if (!decoded) return false
  if ((await inspectCanonicalParent(decoded.parent)) !== 'current') {
    return false
  }
  const candidate = planCreateAdmission({
    parent: decoded.parent,
    leafName: decoded.leafName,
    canonicalRoot: decoded.canonicalRoot,
    semester: decoded.semester,
    setupPlanId: decoded.setupPlanId,
    workspaceId: decoded.workspaceId,
  })
  if (
    canonicalJson(describePlannedAdmission(candidate.planned)) !==
    canonicalJson(description)
  ) {
    return false
  }

  if (subject.kind === 'plan') {
    const context = plans.get(subject.plan.planId)
    if (
      !context ||
      context.kind === 'discard_owned' ||
      !samePlan(context.plan, subject.plan)
    ) {
      return false
    }
    return (
      context.planned.markerBytes.equals(
        candidate.planned.markerBytes,
      ) &&
      context.planned.aggregateBytes.equals(
        candidate.planned.aggregateBytes,
      )
    )
  }

  const { workspace } = subject
  if (
    workspace.canonicalRoot !== decoded.canonicalRoot ||
    workspace.formatVersion !== 3 ||
    workspace.workspaceId !== decoded.workspaceId ||
    workspace.manifest.workspaceId !== decoded.workspaceId ||
    workspace.manifest.semester.yearLevel !==
      decoded.semester.yearLevel ||
    workspace.manifest.semester.term.key !==
      decoded.semester.term.key ||
    workspace.manifest.semester.term.displayName !==
      decoded.semester.term.displayName ||
    workspace.manifest.courses.length !== 0
  ) {
    return false
  }
  try {
    const stateBytes = await readSingleLinkRegularFile(
      path.join(
        workspace.canonicalRoot,
        productDirectoryName,
        stateFileName,
      ),
      admissionMarkerMaxBytes,
    )
    return stateBytes.equals(candidate.planned.aggregateBytes)
  } catch {
    return false
  }
}

async function restoreCreatePlan(
  description: WorkspaceAdmissionPlanDescription,
  plans: Map<string, PlanContext>,
): Promise<AuthorityBoundWorkspacePlan | null> {
  const decoded = decodeRestorablePlanDescription(description)
  if (!decoded) return null
  const parentState = await inspectCanonicalParent(decoded.parent)
  if (parentState !== 'current') return null
  const targetState = await lstatOutcome(decoded.canonicalRoot)
  if (targetState.status !== 'absent') return null

  const candidate = planCreateAdmission({
    parent: decoded.parent,
    leafName: decoded.leafName,
    canonicalRoot: decoded.canonicalRoot,
    semester: decoded.semester,
    setupPlanId: decoded.setupPlanId,
    workspaceId: decoded.workspaceId,
  })
  const context = {
    kind: 'create',
    plan: cloneAuthorityBoundWorkspacePlan(candidate.plan),
    planned: candidate.planned,
  } as const satisfies CreatePlanContext
  if (
    canonicalJson(describeCreatePlan(context)) !==
    canonicalJson(description)
  ) {
    return null
  }
  plans.set(context.plan.planId, context)
  return cloneAuthorityBoundWorkspacePlan(context.plan)
}

function decodeRestorablePlanDescription(
  value: unknown,
): {
  readonly setupPlanId: string
  readonly parent: WorkspaceParentAuthority
  readonly leafName: string
  readonly canonicalRoot: string
  readonly semester: SemesterIdentity
  readonly workspaceId: string
} | null {
  if (
    !isExactRecord(value, ['privateBinding', 'setupPlanId']) ||
    !isOpaqueIdentity(value.setupPlanId) ||
    !isExactRecord(value.privateBinding, ['plan', 'workspace']) ||
    !isExactRecord(value.privateBinding.plan, [
      'canonicalBytesSha256',
      'semester',
      'target',
    ]) ||
    !isSha256(value.privateBinding.plan.canonicalBytesSha256) ||
    !isSemesterIdentity(value.privateBinding.plan.semester) ||
    !isExactRecord(value.privateBinding.plan.target, [
      'canonicalParent',
      'canonicalTarget',
      'leafName',
      'parentDevice',
      'parentInode',
    ]) ||
    !isCanonicalAbsolutePath(
      value.privateBinding.plan.target.canonicalParent,
    ) ||
    !isCanonicalAbsolutePath(
      value.privateBinding.plan.target.canonicalTarget,
    ) ||
    !isSafeLeafName(value.privateBinding.plan.target.leafName) ||
    !isOpaqueIdentity(value.privateBinding.plan.target.parentDevice) ||
    !isOpaqueIdentity(value.privateBinding.plan.target.parentInode) ||
    path.join(
      value.privateBinding.plan.target.canonicalParent,
      value.privateBinding.plan.target.leafName,
    ) !== value.privateBinding.plan.target.canonicalTarget ||
    !isStrictChild(
      value.privateBinding.plan.target.canonicalParent,
      value.privateBinding.plan.target.canonicalTarget,
    ) ||
    !isExactRecord(value.privateBinding.workspace, [
      'expectedInitialAggregateSha256',
      'formatVersion',
      'ownedScaffoldPlanSha256',
      'rootMarkerSha256',
      'workspaceId',
    ]) ||
    !isWorkspaceId(value.privateBinding.workspace.workspaceId) ||
    value.privateBinding.workspace.formatVersion !== 3 ||
    !isSha256(value.privateBinding.workspace.rootMarkerSha256) ||
    !isSha256(
      value.privateBinding.workspace.ownedScaffoldPlanSha256,
    ) ||
    !isSha256(
      value.privateBinding.workspace.expectedInitialAggregateSha256,
    )
  ) {
    return null
  }
  const target = value.privateBinding.plan.target as {
    readonly canonicalParent: string
    readonly canonicalTarget: string
    readonly leafName: string
    readonly parentDevice: string
    readonly parentInode: string
  }
  const semester = value.privateBinding.plan
    .semester as SemesterIdentity
  const workspace = value.privateBinding.workspace as {
    readonly workspaceId: string
  }
  return {
    setupPlanId: value.setupPlanId,
    parent: {
      selectionId: storedParentSelectionId(value.setupPlanId),
      canonicalParent: target.canonicalParent,
      parentDevice: target.parentDevice,
      parentInode: target.parentInode,
    },
    leafName: target.leafName,
    canonicalRoot: target.canonicalTarget,
    semester: cloneSemesterIdentity(semester),
    workspaceId: workspace.workspaceId,
  }
}

async function inspectCreate(
  intent: Extract<WorkspaceIntent, { kind: 'create' }>,
  plans: Map<string, PlanContext>,
): Promise<WorkspaceInspection> {
  if (
    !isValidParentAuthority(intent.parent) ||
    !isSemesterIdentity(intent.semester) ||
    !isSafeLeafName(intent.leafName)
  ) {
    return { outcome: 'unsafe', readOnly: false }
  }

  const parent = await inspectCanonicalParent(intent.parent)
  if (parent !== 'current') {
    return {
      outcome: parent,
      readOnly: false,
    }
  }
  const target = path.join(
    intent.parent.canonicalParent,
    intent.leafName,
  )
  if (!isStrictChild(intent.parent.canonicalParent, target)) {
    return { outcome: 'unsafe', readOnly: false }
  }

  const targetState = await lstatOutcome(target)
  if (targetState.status === 'present') {
    return classifyCreateCollision(target)
  }
  if (targetState.status === 'unavailable') {
    return { outcome: 'unavailable', readOnly: false }
  }

  const { plan, planned } = planCreateAdmission({
    parent: intent.parent,
    leafName: intent.leafName,
    canonicalRoot: target,
    semester: intent.semester,
  })
  plans.set(plan.planId, {
    kind: 'create',
    plan: cloneAuthorityBoundWorkspacePlan(plan),
    planned,
  })
  return { outcome: 'new_target', plan }
}

async function classifyCreateCollision(
  target: string,
): Promise<WorkspaceInspection> {
  const classification = await classifyRoot(target)
  switch (classification.status) {
    case 'current_v3':
      return classification.hasEvidence
        ? { outcome: 'collision', readOnly: false }
        : { outcome: 'workspace_exists', readOnly: false }
    case 'legacy_v2':
      return { outcome: 'legacy_migration_required', readOnly: true }
    case 'incompatible':
      return { outcome: 'incompatible', readOnly: true }
    case 'unsafe':
      return { outcome: 'unsafe', readOnly: false }
    case 'unavailable':
      return { outcome: 'unavailable', readOnly: false }
    case 'collision':
      return { outcome: 'collision', readOnly: false }
  }
}

async function inspectReopen(
  canonicalRoot: string,
): Promise<WorkspaceInspection> {
  const classification = await classifyRoot(canonicalRoot)
  switch (classification.status) {
    case 'current_v3':
      return classification.hasEvidence
        ? { outcome: 'incompatible', readOnly: true }
        : { outcome: 'admitted', workspace: classification.workspace }
    case 'legacy_v2':
      return { outcome: 'legacy_migration_required', readOnly: true }
    case 'incompatible':
      return { outcome: 'incompatible', readOnly: true }
    case 'unsafe':
      return { outcome: 'unsafe', readOnly: false }
    case 'unavailable':
      return { outcome: 'unavailable', readOnly: false }
    case 'collision':
      return { outcome: 'collision', readOnly: false }
  }
}

async function inspectOwnedResume(
  intent: Extract<WorkspaceIntent, { kind: 'resume_owned' }>,
  plans: Map<string, PlanContext>,
): Promise<WorkspaceInspection> {
  if (
    !isOpaqueIdentity(intent.setupId) ||
    !isCanonicalAbsolutePath(intent.canonicalRoot)
  ) {
    return { outcome: 'unsafe', readOnly: false }
  }

  const classification = await classifyRoot(intent.canonicalRoot)
  if (
    classification.status === 'current_v3' &&
    !classification.hasEvidence
  ) {
    return { outcome: 'admitted', workspace: classification.workspace }
  }
  if (classification.status === 'unsafe') {
    return { outcome: 'unsafe', readOnly: false }
  }
  if (classification.status === 'unavailable') {
    return { outcome: 'unavailable', readOnly: false }
  }

  const planned = await readAdmissionEvidence(
    intent.canonicalRoot,
    intent.setupId,
  )
  if (!planned) {
    if (
      classification.status === 'legacy_v2' ||
      classification.status === 'incompatible'
    ) {
      return {
        outcome:
          classification.status === 'legacy_v2'
            ? 'legacy_migration_required'
            : 'incompatible',
        readOnly: true,
      }
    }
    return { outcome: 'collision', readOnly: false }
  }
  if (
    planned.setupPlanId !== intent.setupId ||
    planned.evidence.authority.canonicalRoot !== intent.canonicalRoot ||
    (await inspectCanonicalParent(
      planned.evidence.authority.parent,
    )) !== 'current'
  ) {
    return { outcome: 'collision', readOnly: false }
  }
  let rootIdentity: FileIdentity
  try {
    rootIdentity = await directoryIdentity(intent.canonicalRoot)
    await assertOwnedIncompleteTopology(planned, {
      allowRepairableTemporary: true,
    })
  } catch (error) {
    return error instanceof ApplyFailure && error.outcome === 'unavailable'
      ? { outcome: 'unavailable', readOnly: false }
      : { outcome: 'collision', readOnly: false }
  }

  const planId = `workspace_resume_${randomHex()}`
  const authorityDigest = sha256Canonical({
    operation: 'resume_owned',
    planId,
    canonicalRoot: intent.canonicalRoot,
    markerSha256: planned.markerSha256,
    createAuthorityDigest: planned.evidence.authorityDigest,
    rootIdentity,
  })
  const plan = {
    planId,
    operation: 'resume_owned',
    canonicalRoot: intent.canonicalRoot,
    authorityDigest,
  } satisfies AuthorityBoundWorkspacePlan
  plans.set(planId, {
    kind: 'resume_owned',
    plan: cloneAuthorityBoundWorkspacePlan(plan),
    planned,
    runtimeAuthority: {
      parent: cloneParentAuthority(planned.evidence.authority.parent),
      rootIdentity,
    },
  })
  return { outcome: 'owned_incomplete', plan }
}

async function inspectOwnedDiscard(
  intent: Extract<WorkspaceIntent, { kind: 'discard_owned' }>,
  plans: Map<string, PlanContext>,
): Promise<WorkspaceInspection> {
  if (
    !isOpaqueIdentity(intent.setupId) ||
    !isCanonicalAbsolutePath(intent.canonicalRoot)
  ) {
    return { outcome: 'unsafe', readOnly: false }
  }
  const planned = await readAdmissionEvidence(
    intent.canonicalRoot,
    intent.setupId,
  )
  if (
    !planned ||
    planned.setupPlanId !== intent.setupId ||
    planned.evidence.authority.canonicalRoot !== intent.canonicalRoot ||
    (await inspectCanonicalParent(
      planned.evidence.authority.parent,
    )) !== 'current'
  ) {
    return { outcome: 'collision', readOnly: false }
  }
  const statePath = path.join(
    intent.canonicalRoot,
    planned.evidence.authority.ownedScaffoldPlan.state.relativePath,
  )
  if ((await lstatOutcome(statePath)).status !== 'absent') {
    return { outcome: 'collision', readOnly: false }
  }
  let rootIdentity: FileIdentity
  try {
    rootIdentity = await directoryIdentity(intent.canonicalRoot)
    await assertOwnedIncompleteTopology(planned, {
      allowRepairableTemporary: true,
    })
    await assertExactRegularFileIdentity(
      path.join(
        productRootPath(intent.canonicalRoot),
        evidenceFileName,
      ),
      planned.markerBytes,
      1,
    )
  } catch (error) {
    return error instanceof ApplyFailure && error.outcome === 'unavailable'
      ? { outcome: 'unavailable', readOnly: false }
      : { outcome: 'collision', readOnly: false }
  }
  const planId = `workspace_discard_${randomHex()}`
  const authorityDigest = sha256Canonical({
    operation: 'discard_owned',
    planId,
    canonicalRoot: intent.canonicalRoot,
    markerSha256: planned.markerSha256,
    createAuthorityDigest: planned.evidence.authorityDigest,
    rootIdentity,
  })
  const plan = {
    planId,
    operation: 'discard_owned',
    canonicalRoot: intent.canonicalRoot,
    authorityDigest,
  } satisfies AuthorityBoundWorkspacePlan
  plans.set(planId, {
    kind: 'discard_owned',
    plan: cloneAuthorityBoundWorkspacePlan(plan),
    planned,
    runtimeAuthority: {
      parent: cloneParentAuthority(planned.evidence.authority.parent),
      rootIdentity,
    },
  })
  return { outcome: 'owned_incomplete', plan }
}

async function applyCreate(
  context: CreatePlanContext,
  options: SemesterWorkspaceAdmissionTestOptions,
): Promise<WorkspaceApplyResult> {
  assertPlannedCreateContext(context)
  const parentAuthority = context.planned.evidence.authority.parent
  const parent = await inspectCanonicalParent(parentAuthority)
  if (parent === 'unavailable') throw new ApplyFailure('unavailable')
  if (parent !== 'current') throw new ApplyFailure('authority_changed')
  const target = await lstatOutcome(context.plan.canonicalRoot)
  if (target.status === 'present') throw new ApplyFailure('authority_changed')
  if (target.status === 'unavailable') throw new ApplyFailure('unavailable')

  await inject(options, 'before_root_reservation')
  await assertParentAuthorityCurrent(parentAuthority)
  try {
    await mkdir(context.plan.canonicalRoot, { mode: directoryMode })
  } catch (error) {
    if (hasErrnoCode(error, 'EEXIST')) {
      throw new ApplyFailure('authority_changed')
    }
    throw error
  }
  const rootIdentity = await directoryIdentity(context.plan.canonicalRoot)
  await inject(options, 'after_root_reservation')
  const runtimeAuthority = {
    parent: cloneParentAuthority(parentAuthority),
    rootIdentity,
  } satisfies OwnedRuntimeAuthority
  await assertOwnedRuntimeAuthority(
    context.planned.evidence.authority.canonicalRoot,
    runtimeAuthority,
  )

  const productRoot = productRootPath(context.plan.canonicalRoot)
  try {
    await mkdir(productRoot, { mode: directoryMode })
  } catch (error) {
    if (hasErrnoCode(error, 'EEXIST')) {
      throw new ApplyFailure('conflict')
    }
    throw error
  }
  await assertOwnedRuntimeAuthority(
    context.plan.canonicalRoot,
    runtimeAuthority,
  )
  await writeAdmissionMarker(
    path.join(productRoot, evidenceFileName),
    context.planned.markerBytes,
    context.plan.canonicalRoot,
    runtimeAuthority,
    options,
  )
  await syncDirectory(context.plan.canonicalRoot)
  await syncDirectory(parentAuthority.canonicalParent)
  await assertOwnedRuntimeAuthority(
    context.plan.canonicalRoot,
    runtimeAuthority,
  )

  const workspace = await finishOwnedScaffold(
    context.planned,
    runtimeAuthority,
    options,
    false,
  )
  return { outcome: 'created', workspace }
}

async function applyResume(
  context: ResumePlanContext,
  options: SemesterWorkspaceAdmissionTestOptions,
): Promise<WorkspaceApplyResult> {
  assertPlannedResumeContext(context)
  await assertOwnedRuntimeAuthority(
    context.plan.canonicalRoot,
    context.runtimeAuthority,
  )
  await assertStoredAdmissionMarker(context.planned)
  await assertOwnedIncompleteTopology(context.planned, {
    allowRepairableTemporary: true,
  })
  const workspace = await finishOwnedScaffold(
    context.planned,
    context.runtimeAuthority,
    options,
    true,
  )
  return { outcome: 'resumed', workspace }
}

async function applyDiscard(
  context: DiscardPlanContext,
  options: SemesterWorkspaceAdmissionTestOptions,
): Promise<WorkspaceApplyResult> {
  const root = context.plan.canonicalRoot
  const productRoot = productRootPath(root)
  const authority =
    context.planned.evidence.authority.ownedScaffoldPlan
  await assertOwnedRuntimeAuthority(root, context.runtimeAuthority)
  await assertOwnedIncompleteTopology(context.planned, {
    allowRepairableTemporary: true,
  })
  const statePath = path.join(root, authority.state.relativePath)
  if ((await lstatOutcome(statePath)).status !== 'absent') {
    throw new ApplyFailure('conflict')
  }
  const temporaryPath = path.join(
    root,
    authority.state.temporaryRelativePath,
  )
  const temporary = await lstatOutcome(temporaryPath)
  if (temporary.status === 'unavailable') {
    throw new ApplyFailure('unavailable')
  }
  if (temporary.status === 'present') {
    if (
      !temporary.stats.isFile() ||
      temporary.stats.isSymbolicLink() ||
      temporary.stats.nlink !== 1 ||
      !(
        await regularFileHasExactBytes(
          temporaryPath,
          context.planned.aggregateBytes,
          1,
        )
      ) &&
        !(
          await regularFileIsStrictPrefix(
            temporaryPath,
            context.planned.aggregateBytes,
          )
        )
    ) {
      throw new ApplyFailure('conflict')
    }
    await unlink(temporaryPath)
    await syncDirectory(productRoot)
    await inject(options, 'after_discard_state_temp_unlink')
  }
  for (const directoryName of ['courses', 'inbox'] as const) {
    const directory = path.join(root, directoryName)
    const outcome = await lstatOutcome(directory)
    if (outcome.status === 'unavailable') {
      throw new ApplyFailure('unavailable')
    }
    if (outcome.status === 'absent') continue
    if (
      !outcome.stats.isDirectory() ||
      outcome.stats.isSymbolicLink() ||
      (await readDirectoryEntries(directory)).length !== 0
    ) {
      throw new ApplyFailure('conflict')
    }
    await assertOwnedRuntimeAuthority(root, context.runtimeAuthority)
    await rmdir(directory)
    await syncDirectory(root)
    await inject(
      options,
      directoryName === 'courses'
        ? 'after_discard_courses_remove'
        : 'after_discard_inbox_remove',
    )
  }
  const markerPath = path.join(productRoot, evidenceFileName)
  await assertExactRegularFileIdentity(
    markerPath,
    context.planned.markerBytes,
    1,
  )
  await assertOwnedRuntimeAuthority(root, context.runtimeAuthority)
  if (
    !(await hasExactDirectoryEntries(productRoot, [
      evidenceFileName,
    ]))
  ) {
    throw new ApplyFailure('conflict')
  }
  await unlink(markerPath)
  await syncDirectory(productRoot)
  await inject(options, 'after_discard_marker_unlink')
  await assertOwnedRuntimeAuthority(root, context.runtimeAuthority)
  if (!(await hasExactDirectoryEntries(productRoot, []))) {
    throw new ApplyFailure('conflict')
  }
  await rmdir(productRoot)
  await syncDirectory(root)
  await inject(options, 'after_discard_product_root_remove')
  await assertOwnedRuntimeAuthority(root, context.runtimeAuthority)
  if (!(await hasExactDirectoryEntries(root, []))) {
    throw new ApplyFailure('conflict')
  }
  await rmdir(root)
  await syncDirectory(context.runtimeAuthority.parent.canonicalParent)
  await inject(options, 'after_discard_root_remove')
  return { outcome: 'discarded' }
}

async function finishOwnedScaffold(
  planned: DecodedAdmissionEvidence,
  runtimeAuthority: OwnedRuntimeAuthority,
  options: SemesterWorkspaceAdmissionTestOptions,
  resuming: boolean,
): Promise<AdmittedSemesterWorkspace> {
  const evidence = planned.evidence
  const root = evidence.authority.canonicalRoot
  const productRoot = productRootPath(root)
  const inbox = path.join(root, 'inbox')
  const courses = path.join(root, 'courses')
  await assertOwnedRuntimeAuthority(root, runtimeAuthority)
  await assertOwnedIncompleteTopology(planned, {
    allowRepairableTemporary: resuming,
  })

  await createOrVerifyOwnedDirectory(inbox, resuming)
  await inject(options, 'after_inbox_directory_create')
  await assertOwnedRuntimeAuthority(root, runtimeAuthority)
  await assertOwnedIncompleteTopology(planned, {
    allowRepairableTemporary: resuming,
  })
  await createOrVerifyOwnedDirectory(courses, resuming)
  await inject(options, 'after_courses_directory_create')
  await assertOwnedRuntimeAuthority(root, runtimeAuthority)
  await assertOwnedIncompleteTopology(planned, {
    allowRepairableTemporary: resuming,
  })
  await syncDirectory(root)
  await inject(options, 'after_required_directories')
  await assertOwnedRuntimeAuthority(root, runtimeAuthority)
  await assertOwnedIncompleteTopology(planned, {
    allowRepairableTemporary: resuming,
    requireDirectories: true,
  })

  const statePath = path.join(
    root,
    evidence.authority.ownedScaffoldPlan.state.relativePath,
  )
  const temporaryPath = path.join(
    root,
    evidence.authority.ownedScaffoldPlan.state.temporaryRelativePath,
  )
  const state = await lstatOutcome(statePath)
  if (state.status === 'unavailable') throw new ApplyFailure('unavailable')
  let temporaryIdentity: FileIdentity | undefined
  if (state.status === 'present') {
    const temporary = await lstatOutcome(temporaryPath)
    if (temporary.status === 'unavailable') {
      throw new ApplyFailure('unavailable')
    }
    if (temporary.status === 'present') {
      temporaryIdentity = await assertPublishedTemporaryPair(
        statePath,
        temporaryPath,
        planned.aggregateBytes,
      )
    } else if (
      !(await regularFileHasExactBytes(
        statePath,
        planned.aggregateBytes,
        1,
      ))
    ) {
      throw new ApplyFailure('conflict')
    }
  } else {
    const temporary = await lstatOutcome(temporaryPath)
    if (temporary.status === 'unavailable') {
      throw new ApplyFailure('unavailable')
    }
    if (temporary.status === 'present') {
      if (!resuming) throw new ApplyFailure('conflict')
      temporaryIdentity = await prepareExistingTemporaryState(
        temporaryPath,
        planned,
        root,
        runtimeAuthority,
        options,
      )
    } else {
      const handle = await openExclusiveFile(temporaryPath)
      try {
        await inject(options, 'after_state_temp_create')
        await assertOwnedRuntimeAuthority(root, runtimeAuthority)
        temporaryIdentity = await assertSingleLinkTemporaryHandle(
          handle,
        )
        await assertPathMatchesFileIdentity(
          temporaryPath,
          temporaryIdentity,
          1,
        )
        await handle.writeFile(planned.aggregateBytes)
        await inject(options, 'after_state_temp_write')
        await assertOwnedRuntimeAuthority(root, runtimeAuthority)
        await assertSingleLinkTemporaryHandle(
          handle,
          temporaryIdentity,
        )
        await assertPathMatchesFileIdentity(
          temporaryPath,
          temporaryIdentity,
          1,
        )
        await handle.sync()
        await inject(options, 'after_state_temp_file_sync')
        await assertOwnedRuntimeAuthority(root, runtimeAuthority)
        await assertSingleLinkTemporaryHandle(
          handle,
          temporaryIdentity,
        )
        await assertPathMatchesFileIdentity(
          temporaryPath,
          temporaryIdentity,
          1,
        )
      } finally {
        await handle.close()
      }
    }
    await inject(options, 'before_state_publish')
    await assertOwnedRuntimeAuthority(root, runtimeAuthority)
    await assertOwnedIncompleteTopology(planned, {
      requireDirectories: true,
    })
    if (temporaryIdentity === undefined) {
      throw new ApplyFailure('conflict')
    }
    await assertExactRegularFileIdentity(
      temporaryPath,
      planned.aggregateBytes,
      1,
      temporaryIdentity,
    )
    try {
      await link(temporaryPath, statePath)
    } catch (error) {
      if (hasErrnoCode(error, 'EEXIST')) {
        throw new ApplyFailure('conflict')
      }
      throw error
    }
    await inject(options, 'after_state_publish')
    await assertOwnedRuntimeAuthority(root, runtimeAuthority)
    await assertPublishedTemporaryPair(
      statePath,
      temporaryPath,
      planned.aggregateBytes,
      temporaryIdentity,
    )
    await assertOwnedIncompleteTopology(planned, {
      requireDirectories: true,
    })
  }

  await syncDirectory(productRoot)
  await inject(options, 'after_state_directory_sync')
  await assertOwnedRuntimeAuthority(root, runtimeAuthority)
  await assertOwnedIncompleteTopology(planned, {
    requireDirectories: true,
  })
  const temporaryBeforeUnlink = await lstatOutcome(temporaryPath)
  if (temporaryBeforeUnlink.status === 'unavailable') {
    throw new ApplyFailure('unavailable')
  }
  if (temporaryBeforeUnlink.status === 'present') {
    temporaryIdentity = await assertPublishedTemporaryPair(
      statePath,
      temporaryPath,
      planned.aggregateBytes,
      temporaryIdentity,
    )
    await unlink(temporaryPath)
    await inject(options, 'after_state_temp_unlink')
    await assertOwnedRuntimeAuthority(root, runtimeAuthority)
    await syncDirectory(productRoot)
    await inject(options, 'after_state_temp_unlink_directory_sync')
    await assertOwnedRuntimeAuthority(root, runtimeAuthority)
  }

  await inject(options, 'before_state_readback')
  await assertOwnedRuntimeAuthority(root, runtimeAuthority)
  const readback = await readExpectedOwnedWorkspace(
    planned,
    runtimeAuthority,
  )
  await inject(options, 'after_state_readback')
  await assertOwnedRuntimeAuthority(root, runtimeAuthority)
  await assertOwnedIncompleteTopology(planned, {
    requireDirectories: true,
  })

  await assertStoredAdmissionMarker(planned)
  await inject(options, 'before_evidence_unlink')
  await assertOwnedRuntimeAuthority(root, runtimeAuthority)
  await assertOwnedIncompleteTopology(planned, {
    requireDirectories: true,
  })
  await unlink(path.join(productRoot, evidenceFileName))
  await inject(options, 'after_evidence_unlink')
  await assertOwnedRuntimeAuthority(root, runtimeAuthority)
  await syncDirectory(productRoot)
  await inject(options, 'after_evidence_directory_sync')
  await assertOwnedRuntimeAuthority(root, runtimeAuthority)
  await syncDirectory(root)

  const final = await classifyRoot(root)
  if (
    final.status !== 'current_v3' ||
    final.hasEvidence ||
    canonicalJson(final.workspace) !== canonicalJson(readback)
  ) {
    throw new ApplyFailure('conflict')
  }
  await assertOwnedRuntimeAuthority(root, runtimeAuthority)
  const finalStateBytes = await readSingleLinkRegularFile(
    path.join(
      root,
      evidence.authority.ownedScaffoldPlan.state.relativePath,
    ),
  )
  if (
    sha256(finalStateBytes) !== evidence.authority.aggregateSha256 ||
    !finalStateBytes.equals(planned.aggregateBytes)
  ) {
    throw new ApplyFailure('conflict')
  }
  return admittedWorkspace(root, planned.aggregate)
}

async function readExpectedOwnedWorkspace(
  planned: DecodedAdmissionEvidence,
  runtimeAuthority: OwnedRuntimeAuthority,
): Promise<AdmittedSemesterWorkspace> {
  const evidence = planned.evidence
  const root = evidence.authority.canonicalRoot
  await assertOwnedRuntimeAuthority(root, runtimeAuthority)
  await assertOwnedIncompleteTopology(planned, {
    requireDirectories: true,
  })
  for (const directory of ['inbox', 'courses']) {
    if (!(await isRegularDirectory(path.join(root, directory)))) {
      throw new ApplyFailure('conflict')
    }
  }
  const statePath = path.join(
    root,
    evidence.authority.ownedScaffoldPlan.state.relativePath,
  )
  const bytes = await readRegularFile(statePath)
  if (!bytes.equals(planned.aggregateBytes)) {
    throw new ApplyFailure('conflict')
  }
  const classification = classifySemesterWorkspaceStateBytes(bytes)
  if (
    classification.status !== 'current_v3' ||
    canonicalJson(classification.aggregate) !==
      canonicalJson(planned.aggregate)
  ) {
    throw new ApplyFailure('conflict')
  }
  return admittedWorkspace(root, classification.aggregate)
}

async function classifyRoot(
  canonicalRoot: string,
): Promise<RootClassification> {
  if (!isCanonicalAbsolutePath(canonicalRoot)) {
    return { status: 'unsafe' }
  }
  let rootStats
  try {
    rootStats = await lstat(canonicalRoot)
    if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
      return rootStats.isSymbolicLink()
        ? { status: 'unsafe' }
        : { status: 'collision' }
    }
    if ((await realpath(canonicalRoot)) !== canonicalRoot) {
      return { status: 'unsafe' }
    }
    await access(canonicalRoot, fsConstants.R_OK | fsConstants.X_OK)
  } catch (error) {
    if (hasErrnoCode(error, 'ENOENT')) return { status: 'collision' }
    return { status: 'unavailable' }
  }

  const productRoot = productRootPath(canonicalRoot)
  const product = await lstatOutcome(productRoot)
  if (product.status === 'absent') return { status: 'collision' }
  if (product.status === 'unavailable') return { status: 'unavailable' }
  if (!product.stats.isDirectory() || product.stats.isSymbolicLink()) {
    return { status: 'unsafe' }
  }
  const statePath = path.join(productRoot, stateFileName)
  const state = await lstatOutcome(statePath)
  if (state.status === 'absent') return { status: 'collision' }
  if (state.status === 'unavailable') return { status: 'unavailable' }
  if (!state.stats.isFile() || state.stats.isSymbolicLink()) {
    return { status: 'unsafe' }
  }
  if (state.stats.nlink !== 1) {
    return { status: 'collision' }
  }

  let bytes: Buffer
  try {
    bytes = await readSingleLinkRegularFile(statePath)
  } catch (error) {
    if (error instanceof AdmissionFileTooLarge) {
      return { status: 'incompatible' }
    }
    return error instanceof ApplyFailure
      ? { status: 'collision' }
      : { status: 'unavailable' }
  }
  const stateClassification = classifySemesterWorkspaceStateBytes(bytes)
  if (stateClassification.status === 'legacy_v2') {
    return { status: 'legacy_v2' }
  }
  if (stateClassification.status === 'incompatible') {
    return { status: 'incompatible' }
  }
  for (const directory of ['inbox', 'courses']) {
    const candidate = await lstatOutcome(path.join(canonicalRoot, directory))
    if (candidate.status === 'absent') return { status: 'incompatible' }
    if (candidate.status === 'unavailable') return { status: 'unavailable' }
    if (!candidate.stats.isDirectory() || candidate.stats.isSymbolicLink()) {
      return { status: 'unsafe' }
    }
  }
  const marker = await lstatOutcome(path.join(productRoot, evidenceFileName))
  if (marker.status === 'unavailable') return { status: 'unavailable' }
  if (
    marker.status === 'present' &&
    (!marker.stats.isFile() || marker.stats.isSymbolicLink())
  ) {
    return { status: 'unsafe' }
  }
  return {
    status: 'current_v3',
    workspace: admittedWorkspace(
      canonicalRoot,
      stateClassification.aggregate,
    ),
    hasEvidence: marker.status === 'present',
  }
}

async function readAdmissionEvidence(
  canonicalRoot: string,
  setupPlanId: string,
): Promise<DecodedAdmissionEvidence | null> {
  const markerPath = path.join(
    productRootPath(canonicalRoot),
    evidenceFileName,
  )
  const outcome = await lstatOutcome(markerPath)
  if (outcome.status !== 'present') return null
  if (!outcome.stats.isFile() || outcome.stats.isSymbolicLink()) return null
  try {
    return decodeAdmissionEvidenceBytes(
      await readRegularFile(markerPath, admissionMarkerMaxBytes),
      setupPlanId,
    )
  } catch {
    return null
  }
}

function planCreateAdmission(input: {
  readonly parent: WorkspaceParentAuthority
  readonly leafName: string
  readonly canonicalRoot: string
  readonly semester: SemesterIdentity
  readonly setupPlanId?: string
  readonly workspaceId?: string
}): {
  readonly plan: AuthorityBoundWorkspacePlan
  readonly planned: DecodedAdmissionEvidence
} {
  const setupPlanId =
    input.setupPlanId ?? `workspace_plan_${randomHex()}`
  const setupNonce = admissionSetupNonce(setupPlanId)
  const parent = {
    ...cloneParentAuthority(input.parent),
    selectionId: storedParentSelectionId(setupPlanId),
  }
  const aggregate = createInitialSemesterWorkspaceV3({
    workspaceId: input.workspaceId ?? `workspace_${randomHex()}`,
    semester: input.semester,
  })
  const aggregateBytes = encodeSemesterWorkspaceV3(aggregate)
  const aggregateSha256 = sha256(aggregateBytes)
  const ownedScaffoldPlan = {
    formatVersion: 1,
    directories: [productDirectoryName, 'courses', 'inbox'],
    state: {
      relativePath: '.ay-ple/workspace-state.json',
      temporaryRelativePath:
        `.ay-ple/.${stateFileName}.${setupNonce}.tmp`,
      bytes: aggregateBytes.byteLength,
      sha256: aggregateSha256,
    },
  } as const satisfies OwnedScaffoldPlan
  const authority = {
    setupNonce,
    operation: 'create',
    canonicalRoot: input.canonicalRoot,
    parent,
    leafName: input.leafName,
    workspaceId: aggregate.manifest.workspaceId,
    aggregateBytesBase64: aggregateBytes.toString('base64'),
    aggregateSha256,
    ownedScaffoldPlan,
    ownedScaffoldPlanSha256: sha256Canonical(ownedScaffoldPlan),
  } as const satisfies AdmissionAuthority
  const authorityDigest = sha256Canonical(authority)
  const setupPlanBinding = admissionSetupPlanBinding({
    setupPlanId,
    authorityDigest,
    authority,
  })
  const evidence = {
    kind: evidenceKind,
    formatVersion: 3,
    setupPlanBinding,
    authorityDigest,
    authority,
  } as const satisfies AdmissionEvidence
  const markerBytes = encodeAdmissionEvidence(evidence)
  return {
    plan: {
      planId: setupPlanId,
      operation: 'create',
      canonicalRoot: input.canonicalRoot,
      authorityDigest,
    },
    planned: {
      setupPlanId,
      evidence,
      markerBytes,
      markerSha256: sha256(markerBytes),
      aggregate,
      aggregateBytes,
    },
  }
}

function decodeAdmissionEvidenceBytes(
  markerBytes: Buffer,
  setupPlanId: string,
): DecodedAdmissionEvidence {
  if (markerBytes.byteLength > admissionMarkerMaxBytes) {
    throw new TypeError('Invalid workspace admission evidence.')
  }
  const value = JSON.parse(
    new TextDecoder('utf-8', { fatal: true }).decode(markerBytes),
  ) as unknown
  if (
    !isExactRecord(value, [
      'authority',
      'authorityDigest',
      'formatVersion',
      'kind',
      'setupPlanBinding',
    ]) ||
    value.kind !== evidenceKind ||
    value.formatVersion !== 3 ||
    !isOpaqueIdentity(setupPlanId) ||
    !isSha256(value.setupPlanBinding) ||
    !isSha256(value.authorityDigest)
  ) {
    throw new TypeError('Invalid workspace admission evidence.')
  }
  const authority = decodeAdmissionAuthority(value.authority)
  const authorityDigest = sha256Canonical(authority)
  const setupPlanBinding = admissionSetupPlanBinding({
    setupPlanId,
    authorityDigest,
    authority,
  })
  if (
    value.authorityDigest !== authorityDigest ||
    value.setupPlanBinding !== setupPlanBinding
  ) {
    throw new TypeError('Invalid workspace admission evidence.')
  }
  const aggregateBytes = Buffer.from(
    authority.aggregateBytesBase64,
    'base64',
  )
  if (
    aggregateBytes.toString('base64') !==
      authority.aggregateBytesBase64 ||
    sha256(aggregateBytes) !== authority.aggregateSha256 ||
    aggregateBytes.byteLength !==
      authority.ownedScaffoldPlan.state.bytes ||
    authority.aggregateSha256 !==
      authority.ownedScaffoldPlan.state.sha256
  ) {
    throw new TypeError('Invalid workspace admission evidence.')
  }
  const aggregate = decodeSemesterWorkspaceV3Bytes(aggregateBytes)
  if (aggregate.manifest.workspaceId !== authority.workspaceId) {
    throw new TypeError('Invalid workspace admission evidence.')
  }
  const evidence = {
    kind: evidenceKind,
    formatVersion: 3,
    setupPlanBinding,
    authorityDigest,
    authority,
  } as const satisfies AdmissionEvidence
  const canonicalMarkerBytes = encodeAdmissionEvidence(evidence)
  if (!markerBytes.equals(canonicalMarkerBytes)) {
    throw new TypeError('Invalid workspace admission evidence.')
  }
  return {
    setupPlanId,
    evidence,
    markerBytes: canonicalMarkerBytes,
    markerSha256: sha256(canonicalMarkerBytes),
    aggregate,
    aggregateBytes,
  }
}

function decodeAdmissionAuthority(value: unknown): AdmissionAuthority {
  if (
    !isExactRecord(value, [
      'aggregateBytesBase64',
      'aggregateSha256',
      'canonicalRoot',
      'leafName',
      'operation',
      'ownedScaffoldPlan',
      'ownedScaffoldPlanSha256',
      'parent',
      'setupNonce',
      'workspaceId',
    ]) ||
    typeof value.setupNonce !== 'string' ||
    !/^[0-9a-f]{32}$/.test(value.setupNonce) ||
    value.operation !== 'create' ||
    !isCanonicalAbsolutePath(value.canonicalRoot) ||
    !isValidParentAuthority(value.parent as WorkspaceParentAuthority) ||
    !isSafeLeafName(value.leafName) ||
    !isWorkspaceId(value.workspaceId) ||
    typeof value.aggregateBytesBase64 !== 'string' ||
    !isSha256(value.aggregateSha256) ||
    !isSha256(value.ownedScaffoldPlanSha256)
  ) {
    throw new TypeError('Invalid workspace admission evidence.')
  }
  const parent = cloneParentAuthority(
    value.parent as WorkspaceParentAuthority,
  )
  const expectedRoot = path.join(parent.canonicalParent, value.leafName)
  if (
    expectedRoot !== value.canonicalRoot ||
    !isStrictChild(parent.canonicalParent, value.canonicalRoot)
  ) {
    throw new TypeError('Invalid workspace admission evidence.')
  }
  const ownedScaffoldPlan = decodeOwnedScaffoldPlan(
    value.ownedScaffoldPlan,
    value.setupNonce,
  )
  if (
    sha256Canonical(ownedScaffoldPlan) !==
    value.ownedScaffoldPlanSha256
  ) {
    throw new TypeError('Invalid workspace admission evidence.')
  }
  return {
    setupNonce: value.setupNonce,
    operation: 'create',
    canonicalRoot: value.canonicalRoot,
    parent,
    leafName: value.leafName,
    workspaceId: value.workspaceId,
    aggregateBytesBase64: value.aggregateBytesBase64,
    aggregateSha256: value.aggregateSha256,
    ownedScaffoldPlan,
    ownedScaffoldPlanSha256: value.ownedScaffoldPlanSha256,
  }
}

function decodeOwnedScaffoldPlan(
  value: unknown,
  setupNonce: string,
): OwnedScaffoldPlan {
  if (
    !isExactRecord(value, ['directories', 'formatVersion', 'state']) ||
    value.formatVersion !== 1 ||
    !Array.isArray(value.directories) ||
    canonicalJson(value.directories) !==
      canonicalJson([productDirectoryName, 'courses', 'inbox']) ||
    !isExactRecord(value.state, [
      'bytes',
      'relativePath',
      'sha256',
      'temporaryRelativePath',
    ]) ||
    value.state.relativePath !== '.ay-ple/workspace-state.json' ||
    value.state.temporaryRelativePath !==
      `.ay-ple/.${stateFileName}.${setupNonce}.tmp` ||
    !Number.isSafeInteger(value.state.bytes) ||
    Number(value.state.bytes) <= 0 ||
    !isSha256(value.state.sha256)
  ) {
    throw new TypeError('Invalid workspace admission evidence.')
  }
  return {
    formatVersion: 1,
    directories: [productDirectoryName, 'courses', 'inbox'],
    state: {
      relativePath: '.ay-ple/workspace-state.json',
      temporaryRelativePath: value.state.temporaryRelativePath,
      bytes: Number(value.state.bytes),
      sha256: value.state.sha256,
    },
  }
}

function encodeAdmissionEvidence(evidence: AdmissionEvidence): Buffer {
  return Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
}

async function assertStoredAdmissionMarker(
  planned: DecodedAdmissionEvidence,
): Promise<void> {
  const markerPath = path.join(
    productRootPath(planned.evidence.authority.canonicalRoot),
    evidenceFileName,
  )
  let markerBytes: Buffer
  try {
    markerBytes = await readRegularFile(
      markerPath,
      admissionMarkerMaxBytes,
    )
  } catch {
    throw new ApplyFailure('conflict')
  }
  if (!markerBytes.equals(planned.markerBytes)) {
    throw new ApplyFailure('conflict')
  }
  try {
    const decoded = decodeAdmissionEvidenceBytes(
      markerBytes,
      planned.setupPlanId,
    )
    if (
      decoded.markerSha256 !== planned.markerSha256 ||
      decoded.evidence.authorityDigest !==
        planned.evidence.authorityDigest
    ) {
      throw new ApplyFailure('conflict')
    }
  } catch (error) {
    if (error instanceof ApplyFailure) throw error
    throw new ApplyFailure('conflict')
  }
}

async function assertOwnedIncompleteTopology(
  planned: DecodedAdmissionEvidence,
  options: {
    readonly allowRepairableTemporary?: boolean
    readonly requireDirectories?: boolean
  } = {},
): Promise<void> {
  const root = planned.evidence.authority.canonicalRoot
  const rootEntries = await readDirectoryEntries(root)
  if (
    rootEntries.some(
      (entry) =>
        entry !== productDirectoryName &&
        entry !== 'inbox' &&
        entry !== 'courses',
    )
  ) {
    throw new ApplyFailure('conflict')
  }
  const productRoot = productRootPath(root)
  if (!(await isRegularDirectory(productRoot))) {
    throw new ApplyFailure('conflict')
  }
  await assertStoredAdmissionMarker(planned)

  for (const directoryName of ['inbox', 'courses'] as const) {
    const directory = path.join(root, directoryName)
    const outcome = await lstatOutcome(directory)
    if (outcome.status === 'unavailable') {
      throw new ApplyFailure('unavailable')
    }
    if (outcome.status === 'absent') {
      if (options.requireDirectories) {
        throw new ApplyFailure('conflict')
      }
      continue
    }
    if (
      !outcome.stats.isDirectory() ||
      outcome.stats.isSymbolicLink() ||
      (await readDirectoryEntries(directory)).length !== 0
    ) {
      throw new ApplyFailure('conflict')
    }
  }

  const temporaryName = path.basename(
    planned.evidence.authority.ownedScaffoldPlan.state
      .temporaryRelativePath,
  )
  const productEntries = await readDirectoryEntries(productRoot)
  if (
    productEntries.some(
      (entry) =>
        entry !== evidenceFileName &&
        entry !== stateFileName &&
        entry !== temporaryName,
    )
  ) {
    throw new ApplyFailure('conflict')
  }
  const candidates = await Promise.all(
    [stateFileName, temporaryName].map(async (candidate) => ({
      candidate,
      candidatePath: path.join(productRoot, candidate),
      outcome: await lstatOutcome(path.join(productRoot, candidate)),
    })),
  )
  for (const { outcome } of candidates) {
    if (outcome.status === 'unavailable') {
      throw new ApplyFailure('unavailable')
    }
  }
  const state = candidates[0]!.outcome
  const temporary = candidates[1]!.outcome
  if (temporary.status === 'present') {
    if (state.status === 'present') {
      await assertPublishedTemporaryPair(
        candidates[0]!.candidatePath,
        candidates[1]!.candidatePath,
        planned.aggregateBytes,
      )
    } else if (
      !temporary.stats.isFile() ||
      temporary.stats.nlink !== 1
    ) {
      throw new ApplyFailure('conflict')
    }
  }
  for (const { candidate, candidatePath, outcome } of candidates) {
    if (outcome.status === 'present') {
      const exact = await regularFileHasExactBytes(
        candidatePath,
        planned.aggregateBytes,
        candidate === temporaryName
          ? state.status === 'present'
            ? 2
            : 1
          : temporary.status === 'present'
            ? 2
            : 1,
      )
      const recognizedRepairableTemporary =
        options.allowRepairableTemporary === true &&
        candidate === temporaryName &&
        (await regularFileIsStrictPrefix(
          candidatePath,
          planned.aggregateBytes,
        ))
      if (
        !exact &&
        !recognizedRepairableTemporary
      ) {
        throw new ApplyFailure('conflict')
      }
    }
  }
}

async function inspectCanonicalParent(
  authority: WorkspaceParentAuthority,
): Promise<'current' | 'unsafe' | 'unavailable'> {
  if (
    !isCanonicalAbsolutePath(authority.canonicalParent) ||
    path.parse(authority.canonicalParent).root === authority.canonicalParent
  ) {
    return 'unsafe'
  }
  try {
    const stats = await lstat(authority.canonicalParent, { bigint: true })
    if (!stats.isDirectory() || stats.isSymbolicLink()) return 'unsafe'
    if ((await realpath(authority.canonicalParent)) !== authority.canonicalParent) {
      return 'unsafe'
    }
    await access(
      authority.canonicalParent,
      fsConstants.R_OK | fsConstants.W_OK | fsConstants.X_OK,
    )
    return stats.dev.toString() === authority.parentDevice &&
      stats.ino.toString() === authority.parentInode
      ? 'current'
      : 'unsafe'
  } catch (error) {
    return hasErrnoCode(error, 'ENOENT') ? 'unsafe' : 'unavailable'
  }
}

function assertPlannedCreateContext(
  context: CreatePlanContext,
): void {
  let decoded: DecodedAdmissionEvidence
  try {
    decoded = decodeAdmissionEvidenceBytes(
      context.planned.markerBytes,
      context.plan.planId,
    )
  } catch {
    throw new ApplyFailure('authority_changed')
  }
  if (
    context.plan.operation !== 'create' ||
    context.plan.planId !== decoded.setupPlanId ||
    context.plan.canonicalRoot !==
      decoded.evidence.authority.canonicalRoot ||
    context.plan.authorityDigest !==
      decoded.evidence.authorityDigest ||
    decoded.markerSha256 !== context.planned.markerSha256 ||
    !decoded.aggregateBytes.equals(context.planned.aggregateBytes)
  ) {
    throw new ApplyFailure('authority_changed')
  }
}

function assertPlannedResumeContext(
  context: ResumePlanContext,
): void {
  const expectedDigest = sha256Canonical({
    operation: 'resume_owned',
    planId: context.plan.planId,
    canonicalRoot: context.plan.canonicalRoot,
    markerSha256: context.planned.markerSha256,
    createAuthorityDigest:
      context.planned.evidence.authorityDigest,
    rootIdentity: context.runtimeAuthority.rootIdentity,
  })
  if (
    context.plan.operation !== 'resume_owned' ||
    context.plan.canonicalRoot !==
      context.planned.evidence.authority.canonicalRoot ||
    context.plan.authorityDigest !== expectedDigest
  ) {
    throw new ApplyFailure('authority_changed')
  }
}

async function assertParentAuthorityCurrent(
  authority: WorkspaceParentAuthority,
): Promise<void> {
  const current = await inspectCanonicalParent(authority)
  if (current === 'unavailable') {
    throw new ApplyFailure('unavailable')
  }
  if (current !== 'current') {
    throw new ApplyFailure('authority_changed')
  }
}

async function assertOwnedRuntimeAuthority(
  root: string,
  authority: OwnedRuntimeAuthority,
): Promise<void> {
  await assertParentAuthorityCurrent(authority.parent)
  if (!(await rootMatchesIdentity(root, authority.rootIdentity))) {
    throw new ApplyFailure('authority_changed')
  }
}

async function writeAdmissionMarker(
  markerPath: string,
  markerBytes: Buffer,
  root: string,
  authority: OwnedRuntimeAuthority,
  options: SemesterWorkspaceAdmissionTestOptions,
): Promise<void> {
  const handle = await openExclusiveFile(markerPath)
  try {
    await inject(options, 'after_marker_create')
    await assertOwnedRuntimeAuthority(root, authority)
    await handle.writeFile(markerBytes)
    await inject(options, 'after_marker_write')
    await assertOwnedRuntimeAuthority(root, authority)
    await handle.sync()
    await inject(options, 'after_marker_file_sync')
    await assertOwnedRuntimeAuthority(root, authority)
  } finally {
    await handle.close()
  }
  await syncDirectory(path.dirname(markerPath))
  await inject(options, 'after_marker_directory_sync')
  await assertOwnedRuntimeAuthority(root, authority)
}

async function createOrVerifyOwnedDirectory(
  directory: string,
  resuming: boolean,
): Promise<void> {
  const current = await lstatOutcome(directory)
  if (current.status === 'absent') {
    try {
      await mkdir(directory, { mode: directoryMode })
      return
    } catch (error) {
      if (!hasErrnoCode(error, 'EEXIST')) throw error
      if (!resuming) throw new ApplyFailure('conflict')
    }
  } else if (!resuming) {
    throw new ApplyFailure('conflict')
  }
  if (
    current.status !== 'present' ||
    !current.stats.isDirectory() ||
    current.stats.isSymbolicLink()
  ) {
    throw new ApplyFailure('conflict')
  }
}

async function readDirectoryEntries(directory: string): Promise<string[]> {
  try {
    return await readdir(directory)
  } catch {
    throw new ApplyFailure('unavailable')
  }
}

async function openExclusiveFile(filePath: string) {
  return open(
    filePath,
    fsConstants.O_WRONLY |
      fsConstants.O_CREAT |
      fsConstants.O_EXCL |
      fsConstants.O_NOFOLLOW,
    fileMode,
  )
}

async function prepareExistingTemporaryState(
  temporaryPath: string,
  planned: DecodedAdmissionEvidence,
  root: string,
  runtimeAuthority: OwnedRuntimeAuthority,
  options: SemesterWorkspaceAdmissionTestOptions,
): Promise<FileIdentity> {
  await assertOwnedRuntimeAuthority(root, runtimeAuthority)
  await assertStoredAdmissionMarker(planned)
  let handle
  try {
    handle = await open(
      temporaryPath,
      fsConstants.O_RDWR | fsConstants.O_NOFOLLOW,
    )
  } catch (error) {
    if (
      hasErrnoCode(error, 'ELOOP') ||
      hasErrnoCode(error, 'ENOENT')
    ) {
      throw new ApplyFailure('conflict')
    }
    throw error
  }
  try {
    const identity = await assertSingleLinkTemporaryHandle(handle)
    await assertPathMatchesFileIdentity(temporaryPath, identity, 1)
    const stats = await handle.stat()
    if (stats.size > planned.aggregateBytes.byteLength) {
      throw new ApplyFailure('conflict')
    }
    const currentBytes = await handle.readFile()
    await assertSingleLinkTemporaryHandle(handle, identity)
    await assertPathMatchesFileIdentity(temporaryPath, identity, 1)
    const exact = currentBytes.equals(planned.aggregateBytes)
    const repairable = isStrictBufferPrefix(
      currentBytes,
      planned.aggregateBytes,
    )
    if (!exact && !repairable) {
      throw new ApplyFailure('conflict')
    }
    if (repairable) {
      await handle.truncate(0)
      await writeBufferAtStart(handle, planned.aggregateBytes)
      await inject(options, 'after_state_temp_write')
      await assertOwnedRuntimeAuthority(root, runtimeAuthority)
      await assertStoredAdmissionMarker(planned)
      await assertSingleLinkTemporaryHandle(handle, identity)
      await assertPathMatchesFileIdentity(temporaryPath, identity, 1)
    }
    await assertSingleLinkTemporaryHandle(handle, identity)
    await handle.sync()
    await inject(options, 'after_state_temp_file_sync')
    await assertOwnedRuntimeAuthority(root, runtimeAuthority)
    await assertStoredAdmissionMarker(planned)
    await assertSingleLinkTemporaryHandle(handle, identity)
    await assertPathMatchesFileIdentity(temporaryPath, identity, 1)
    return identity
  } finally {
    await handle.close()
  }
}

async function writeBufferAtStart(
  handle: Awaited<ReturnType<typeof open>>,
  bytes: Buffer,
): Promise<void> {
  let offset = 0
  while (offset < bytes.byteLength) {
    const { bytesWritten } = await handle.write(
      bytes,
      offset,
      bytes.byteLength - offset,
      offset,
    )
    if (bytesWritten <= 0) {
      throw new TypeError('Unable to write workspace state.')
    }
    offset += bytesWritten
  }
  await handle.truncate(bytes.byteLength)
}

async function readRegularFile(
  filePath: string,
  maxBytes?: number,
): Promise<Buffer> {
  const handle = await open(
    filePath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  )
  try {
    const stats = await handle.stat()
    if (!stats.isFile()) throw new TypeError('Expected a regular file.')
    if (
      (maxBytes !== undefined && stats.size > maxBytes) ||
      (maxBytes === undefined &&
        stats.size > 128 * 1024 * 1024 &&
        stats.blocks * 512 < stats.size / 2)
    ) {
      throw new AdmissionFileTooLarge()
    }
    return await handle.readFile()
  } finally {
    await handle.close()
  }
}

async function readSingleLinkRegularFile(
  filePath: string,
  maxBytes?: number,
): Promise<Buffer> {
  const handle = await open(
    filePath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  )
  try {
    const before = await handle.stat({ bigint: true })
    if (!before.isFile() || before.nlink !== 1n) {
      throw new ApplyFailure('conflict')
    }
    if (
      (maxBytes !== undefined &&
        before.size > BigInt(maxBytes)) ||
      (maxBytes === undefined &&
        before.size > 128n * 1024n * 1024n &&
        before.blocks * 512n < before.size / 2n)
    ) {
      throw new AdmissionFileTooLarge()
    }
    const identity = fileIdentityFromStats(before)
    const bytes = await handle.readFile()
    const after = await handle.stat({ bigint: true })
    if (
      !after.isFile() ||
      after.nlink !== 1n ||
      !sameFileIdentity(fileIdentityFromStats(after), identity)
    ) {
      throw new ApplyFailure('conflict')
    }
    await assertPathMatchesFileIdentity(filePath, identity, 1)
    return bytes
  } finally {
    await handle.close()
  }
}

async function regularFileHasExactBytes(
  filePath: string,
  expectedBytes: Buffer,
  requiredLinkCount?: number,
): Promise<boolean> {
  try {
    await assertExactRegularFileIdentity(
      filePath,
      expectedBytes,
      requiredLinkCount,
    )
    return true
  } catch {
    return false
  }
}

async function assertExactRegularFileIdentity(
  filePath: string,
  expectedBytes: Buffer,
  requiredLinkCount?: number,
  expectedIdentity?: FileIdentity,
): Promise<FileIdentity> {
  let handle
  try {
    handle = await open(
      filePath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    )
  } catch {
    throw new ApplyFailure('conflict')
  }
  try {
    const before = await handle.stat({ bigint: true })
    const identity = fileIdentityFromStats(before)
    if (
      !before.isFile() ||
      (requiredLinkCount !== undefined &&
        before.nlink !== BigInt(requiredLinkCount)) ||
      (expectedIdentity !== undefined &&
        !sameFileIdentity(identity, expectedIdentity))
    ) {
      throw new ApplyFailure('conflict')
    }
    const bytes = await handle.readFile()
    const after = await handle.stat({ bigint: true })
    if (
      !bytes.equals(expectedBytes) ||
      !after.isFile() ||
      (requiredLinkCount !== undefined &&
        after.nlink !== BigInt(requiredLinkCount)) ||
      !sameFileIdentity(fileIdentityFromStats(after), identity)
    ) {
      throw new ApplyFailure('conflict')
    }
    await assertPathMatchesFileIdentity(
      filePath,
      identity,
      requiredLinkCount,
    )
    return identity
  } finally {
    await handle.close()
  }
}

async function assertPublishedTemporaryPair(
  statePath: string,
  temporaryPath: string,
  expectedBytes: Buffer,
  expectedIdentity?: FileIdentity,
): Promise<FileIdentity> {
  const stateIdentity = await assertExactRegularFileIdentity(
    statePath,
    expectedBytes,
    2,
    expectedIdentity,
  )
  const temporaryIdentity = await assertExactRegularFileIdentity(
    temporaryPath,
    expectedBytes,
    2,
    stateIdentity,
  )
  if (!sameFileIdentity(stateIdentity, temporaryIdentity)) {
    throw new ApplyFailure('conflict')
  }
  return temporaryIdentity
}

async function assertSingleLinkTemporaryHandle(
  handle: Awaited<ReturnType<typeof open>>,
  expectedIdentity?: FileIdentity,
): Promise<FileIdentity> {
  const stats = await handle.stat({ bigint: true })
  const identity = fileIdentityFromStats(stats)
  if (
    !stats.isFile() ||
    stats.nlink !== 1n ||
    (expectedIdentity !== undefined &&
      !sameFileIdentity(identity, expectedIdentity))
  ) {
    throw new ApplyFailure('conflict')
  }
  return identity
}

async function assertPathMatchesFileIdentity(
  filePath: string,
  expectedIdentity: FileIdentity,
  requiredLinkCount?: number,
): Promise<void> {
  let stats
  try {
    stats = await lstat(filePath, { bigint: true })
  } catch {
    throw new ApplyFailure('conflict')
  }
  if (
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    (requiredLinkCount !== undefined &&
      stats.nlink !== BigInt(requiredLinkCount)) ||
    !sameFileIdentity(fileIdentityFromStats(stats), expectedIdentity)
  ) {
    throw new ApplyFailure('conflict')
  }
}

async function regularFileIsStrictPrefix(
  filePath: string,
  expectedBytes: Buffer,
): Promise<boolean> {
  let handle
  try {
    handle = await open(
      filePath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    )
    const identity = await assertSingleLinkTemporaryHandle(handle)
    await assertPathMatchesFileIdentity(filePath, identity, 1)
    const stats = await handle.stat()
    if (
      stats.size >= expectedBytes.byteLength
    ) {
      return false
    }
    const bytes = await handle.readFile()
    await assertSingleLinkTemporaryHandle(handle, identity)
    await assertPathMatchesFileIdentity(filePath, identity, 1)
    return isStrictBufferPrefix(bytes, expectedBytes)
  } catch {
    return false
  } finally {
    await handle?.close()
  }
}

function isStrictBufferPrefix(
  candidate: Buffer,
  expected: Buffer,
): boolean {
  return (
    candidate.byteLength < expected.byteLength &&
    expected.subarray(0, candidate.byteLength).equals(candidate)
  )
}

async function syncDirectory(directory: string): Promise<void> {
  const handle = await open(
    directory,
    fsConstants.O_RDONLY |
      fsConstants.O_DIRECTORY |
      fsConstants.O_NOFOLLOW,
  )
  try {
    await handle.sync()
  } finally {
    await handle.close()
  }
}

async function hasExactDirectoryEntries(
  directory: string,
  expected: readonly string[],
): Promise<boolean> {
  const actual = (await readDirectoryEntries(directory)).sort()
  const sortedExpected = [...expected].sort()
  return (
    actual.length === sortedExpected.length &&
    actual.every((entry, index) => entry === sortedExpected[index])
  )
}

async function isRegularDirectory(directory: string): Promise<boolean> {
  try {
    const stats = await lstat(directory)
    return stats.isDirectory() && !stats.isSymbolicLink()
  } catch {
    return false
  }
}

async function directoryIdentity(directory: string): Promise<FileIdentity> {
  const stats = await lstat(directory, { bigint: true })
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new ApplyFailure('authority_changed')
  }
  return fileIdentityFromStats(stats)
}

function fileIdentityFromStats(stats: {
  readonly dev: bigint
  readonly ino: bigint
  readonly birthtimeNs: bigint
}): FileIdentity {
  return {
    device: stats.dev.toString(),
    inode: stats.ino.toString(),
    birthtimeNs: stats.birthtimeNs.toString(),
  }
}

function sameFileIdentity(
  left: FileIdentity,
  right: FileIdentity,
): boolean {
  return (
    left.device === right.device &&
    left.inode === right.inode &&
    left.birthtimeNs === right.birthtimeNs
  )
}

async function rootMatchesIdentity(
  root: string,
  expected: FileIdentity,
): Promise<boolean> {
  try {
    const actual = await directoryIdentity(root)
    return (
      sameFileIdentity(actual, expected) &&
      (await realpath(root)) === root
    )
  } catch {
    return false
  }
}

async function lstatOutcome(
  candidate: string,
): Promise<
  | { readonly status: 'absent' }
  | { readonly status: 'present'; readonly stats: Awaited<ReturnType<typeof lstat>> }
  | { readonly status: 'unavailable' }
> {
  try {
    return { status: 'present', stats: await lstat(candidate) }
  } catch (error) {
    return hasErrnoCode(error, 'ENOENT')
      ? { status: 'absent' }
      : { status: 'unavailable' }
  }
}

async function pathExists(candidate: string): Promise<boolean> {
  return (await lstatOutcome(candidate)).status === 'present'
}

function admittedWorkspace(
  canonicalRoot: string,
  aggregate: SemesterWorkspaceV3,
): AdmittedSemesterWorkspace {
  return {
    canonicalRoot,
    workspaceId: aggregate.manifest.workspaceId,
    formatVersion: 3,
    manifest: cloneManifest(aggregate.manifest),
  }
}

function cloneManifest(manifest: WorkspaceManifest): WorkspaceManifest {
  return {
    workspaceId: manifest.workspaceId,
    semester: {
      yearLevel: manifest.semester.yearLevel,
      term: {
        key: manifest.semester.term.key,
        displayName: manifest.semester.term.displayName,
      },
    },
    courses: [],
  }
}

function cloneParentAuthority(
  parent: WorkspaceParentAuthority,
): WorkspaceParentAuthority {
  return { ...parent }
}

function cloneAuthorityBoundWorkspacePlan(
  plan: AuthorityBoundWorkspacePlan,
): AuthorityBoundWorkspacePlan {
  return {
    planId: plan.planId,
    operation: plan.operation,
    canonicalRoot: plan.canonicalRoot,
    authorityDigest: plan.authorityDigest,
  }
}

function samePlan(
  expected: AuthorityBoundWorkspacePlan,
  actual: AuthorityBoundWorkspacePlan,
): boolean {
  return (
    expected.planId === actual.planId &&
    expected.operation === actual.operation &&
    expected.canonicalRoot === actual.canonicalRoot &&
    expected.authorityDigest === actual.authorityDigest
  )
}

function isValidParentAuthority(
  value: WorkspaceParentAuthority,
): boolean {
  return (
    isOpaqueIdentity(value.selectionId) &&
    isCanonicalAbsolutePath(value.canonicalParent) &&
    /^[0-9]+$/.test(value.parentDevice) &&
    /^[0-9]+$/.test(value.parentInode)
  )
}

function isSafeLeafName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value === value.trim() &&
    value !== '.' &&
    value !== '..' &&
    !value.includes('/') &&
    !value.includes('\\') &&
    !value.includes('\0') &&
    !/[\u0000-\u001f\u007f]/.test(value) &&
    Buffer.byteLength(value, 'utf8') <= leafNameMaxBytes
  )
}

function isCanonicalAbsolutePath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    path.isAbsolute(value) &&
    path.normalize(value) === value
  )
}

function isStrictChild(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate)
  return (
    relative.length > 0 &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative) &&
    !relative.includes(path.sep)
  )
}

function isOpaqueIdentity(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    Buffer.byteLength(value, 'utf8') <= opaqueIdentityMaxBytes
  )
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
}

function isExactRecord(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  )
}

function productRootPath(root: string): string {
  return path.join(root, productDirectoryName)
}

function cloneSemesterIdentity(
  semester: SemesterIdentity,
): SemesterIdentity {
  return {
    yearLevel: semester.yearLevel,
    term: {
      key: semester.term.key,
      displayName: semester.term.displayName,
    },
  }
}

async function inject(
  options: SemesterWorkspaceAdmissionTestOptions,
  point: WorkspaceAdmissionFaultPoint,
): Promise<void> {
  if (!options.fault) return
  try {
    await options.fault(point)
  } catch (error) {
    throw new InjectedAdmissionFault(error)
  }
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function sha256Canonical(value: unknown): string {
  return sha256(Buffer.from(canonicalJson(value), 'utf8'))
}

function admissionSetupPlanBinding(input: {
  readonly setupPlanId: string
  readonly authorityDigest: string
  readonly authority: AdmissionAuthority
}): string {
  return createHmac('sha256', input.setupPlanId)
    .update(
      Buffer.from(
        canonicalJson({
          kind: evidenceKind,
          formatVersion: 3,
          authorityDigest: input.authorityDigest,
          authority: input.authority,
        }),
        'utf8',
      ),
    )
    .digest('hex')
}

function admissionSetupNonce(setupPlanId: string): string {
  return sha256Canonical({
    domain: 'ay-ple.workspace-admission.setup-nonce.v1',
    setupPlanId,
  }).slice(0, 32)
}

function storedParentSelectionId(setupPlanId: string): string {
  return `selection_${sha256Canonical({
    domain: 'ay-ple.workspace-admission.parent-selection.v1',
    setupPlanId,
  }).slice(0, 32)}`
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value)
}

function randomHex(): string {
  return randomUUID().replaceAll('-', '')
}

function hasErrnoCode(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === code
  )
}

class ApplyFailure extends Error {
  constructor(
    readonly outcome: 'authority_changed' | 'conflict' | 'unavailable',
  ) {
    super(outcome)
  }
}

class InjectedAdmissionFault extends Error {
  constructor(readonly cause: unknown) {
    super('Injected SemesterWorkspace admission fault.')
  }
}

class AdmissionFileTooLarge extends Error {}
