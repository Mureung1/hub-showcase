/// <reference types="node" />

import { createHash, randomUUID } from 'node:crypto'
import { constants as fsConstants } from 'node:fs'
import {
  access,
  link,
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
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
  WorkspaceInspection,
  WorkspaceIntent,
  WorkspaceManifest,
  WorkspaceParentAuthority,
} from './contract.js'
import {
  classifySemesterWorkspaceStateBytes,
  createInitialSemesterWorkspaceV3,
  decodeSemesterWorkspaceV3,
  encodeSemesterWorkspaceV3,
  isSemesterIdentity,
} from './v3-codec.js'

const productDirectoryName = '.ay-ple'
const stateFileName = 'workspace-state.json'
const evidenceFileName = '.workspace-admission.json'
const directoryMode = 0o700
const fileMode = 0o600
const leafNameMaxBytes = 255
const opaqueIdentityMaxBytes = 512
const admissionFileMaxBytes = 1024 * 1024
const evidenceKind = 'ay-ple.workspace-admission-evidence'

export type WorkspaceAdmissionFaultPoint =
  | 'before_root_reservation'
  | 'after_root_reservation'
  | 'after_required_directories'
  | 'after_state_temp_write'
  | 'after_state_file_sync'
  | 'before_state_publish'
  | 'after_state_publish'
  | 'after_state_directory_sync'
  | 'before_state_readback'
  | 'after_state_readback'
  | 'after_evidence_removal'

export type SemesterWorkspaceAdmissionOptions = {
  readonly fault?: (
    point: WorkspaceAdmissionFaultPoint,
  ) => void | Promise<void>
}

type FileIdentity = {
  readonly device: string
  readonly inode: string
  readonly birthtimeNs: string
}

type AdmissionEvidence = {
  readonly kind: typeof evidenceKind
  readonly formatVersion: 1
  readonly setupId: string
  readonly authorityDigest: string
  readonly canonicalRoot: string
  readonly rootIdentity: FileIdentity
  readonly aggregate: SemesterWorkspaceV3
  readonly aggregateSha256: string
  readonly temporaryStateFileName: string
}

type CreatePlanContext = {
  readonly kind: 'create'
  readonly plan: AuthorityBoundWorkspacePlan
  readonly parent: WorkspaceParentAuthority
  readonly leafName: string
  readonly aggregate: SemesterWorkspaceV3
  readonly aggregateBytes: Buffer
  readonly aggregateSha256: string
  readonly temporaryStateFileName: string
  rootIdentity?: FileIdentity
}

type ResumePlanContext = {
  readonly kind: 'resume_owned'
  readonly plan: AuthorityBoundWorkspacePlan
  readonly evidence: AdmissionEvidence
}

type PlanContext = CreatePlanContext | ResumePlanContext

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
  options: SemesterWorkspaceAdmissionOptions = {},
): SemesterWorkspaceAdmission {
  const plans = new Map<string, PlanContext>()

  return {
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
          return { outcome: 'unsafe', readOnly: false }
        default:
          return { outcome: 'unsafe', readOnly: false }
      }
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

  const planId = `workspace_plan_${randomHex()}`
  const aggregate = createInitialSemesterWorkspaceV3({
    workspaceId: `workspace_${randomHex()}`,
    semester: intent.semester,
  })
  const aggregateBytes = encodeSemesterWorkspaceV3(aggregate)
  const aggregateSha256 = sha256(aggregateBytes)
  const temporaryStateFileName =
    `.${stateFileName}.${randomHex()}.tmp`
  const authorityDigest = sha256Canonical({
    operation: 'create',
    planId,
    canonicalRoot: target,
    parent: intent.parent,
    leafName: intent.leafName,
    aggregateSha256,
  })
  const plan = {
    planId,
    operation: 'create',
    canonicalRoot: target,
    authorityDigest,
  } satisfies AuthorityBoundWorkspacePlan
  plans.set(planId, {
    kind: 'create',
    plan,
    parent: cloneParentAuthority(intent.parent),
    leafName: intent.leafName,
    aggregate,
    aggregateBytes,
    aggregateSha256,
    temporaryStateFileName,
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

  const evidence = await readAdmissionEvidence(intent.canonicalRoot)
  const remembered = plans.get(intent.setupId)
  const createContext =
    remembered?.kind === 'create' &&
    remembered.plan.canonicalRoot === intent.canonicalRoot &&
    remembered.rootIdentity
      ? remembered
      : undefined
  const effectiveEvidence =
    evidence ??
    (createContext
      ? evidenceFromCreateContext(
          createContext,
          createContext.rootIdentity!,
        )
      : null)
  if (!effectiveEvidence) {
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
    effectiveEvidence.setupId !== intent.setupId ||
    effectiveEvidence.canonicalRoot !== intent.canonicalRoot ||
    !(await rootMatchesIdentity(
      intent.canonicalRoot,
      effectiveEvidence.rootIdentity,
    ))
  ) {
    return { outcome: 'collision', readOnly: false }
  }

  const planId = `workspace_resume_${randomHex()}`
  const authorityDigest = sha256Canonical({
    operation: 'resume_owned',
    planId,
    evidence: effectiveEvidence,
  })
  const plan = {
    planId,
    operation: 'resume_owned',
    canonicalRoot: intent.canonicalRoot,
    authorityDigest,
  } satisfies AuthorityBoundWorkspacePlan
  plans.set(planId, {
    kind: 'resume_owned',
    plan,
    evidence: effectiveEvidence,
  })
  return { outcome: 'owned_incomplete', plan }
}

async function applyCreate(
  context: CreatePlanContext,
  options: SemesterWorkspaceAdmissionOptions,
): Promise<WorkspaceApplyResult> {
  const parent = await inspectCanonicalParent(context.parent)
  if (parent === 'unavailable') throw new ApplyFailure('unavailable')
  if (parent !== 'current') throw new ApplyFailure('authority_changed')
  const target = await lstatOutcome(context.plan.canonicalRoot)
  if (target.status === 'present') throw new ApplyFailure('authority_changed')
  if (target.status === 'unavailable') throw new ApplyFailure('unavailable')

  await inject(options, 'before_root_reservation')
  try {
    await mkdir(context.plan.canonicalRoot, { mode: directoryMode })
  } catch (error) {
    if (hasErrnoCode(error, 'EEXIST')) {
      throw new ApplyFailure('authority_changed')
    }
    throw error
  }
  const rootIdentity = await directoryIdentity(context.plan.canonicalRoot)
  context.rootIdentity = rootIdentity
  const evidence = evidenceFromCreateContext(context, rootIdentity)
  const productRoot = productRootPath(context.plan.canonicalRoot)
  await mkdir(productRoot, { mode: directoryMode })
  await writeExclusiveSyncedFile(
    path.join(productRoot, evidenceFileName),
    encodeAdmissionEvidence(evidence),
  )
  await syncDirectory(productRoot)
  await syncDirectory(context.plan.canonicalRoot)
  await syncDirectory(context.parent.canonicalParent)
  await inject(options, 'after_root_reservation')

  const workspace = await finishOwnedScaffold(evidence, options, false)
  return { outcome: 'created', workspace }
}

async function applyResume(
  context: ResumePlanContext,
  options: SemesterWorkspaceAdmissionOptions,
): Promise<WorkspaceApplyResult> {
  if (
    !(await rootMatchesIdentity(
      context.plan.canonicalRoot,
      context.evidence.rootIdentity,
    ))
  ) {
    throw new ApplyFailure('authority_changed')
  }
  await assertOwnedIncompleteEntries(context.evidence)
  const workspace = await finishOwnedScaffold(
    context.evidence,
    options,
    true,
  )
  return { outcome: 'resumed', workspace }
}

async function finishOwnedScaffold(
  evidence: AdmissionEvidence,
  options: SemesterWorkspaceAdmissionOptions,
  resuming: boolean,
): Promise<AdmittedSemesterWorkspace> {
  const root = evidence.canonicalRoot
  const productRoot = productRootPath(root)
  const inbox = path.join(root, 'inbox')
  const courses = path.join(root, 'courses')
  if (resuming) {
    await ensureOwnedDirectory(inbox)
    await ensureOwnedDirectory(courses)
  } else {
    await mkdir(inbox, { mode: directoryMode })
    await mkdir(courses, { mode: directoryMode })
  }
  await syncDirectory(root)
  await inject(options, 'after_required_directories')

  const statePath = path.join(productRoot, stateFileName)
  const temporaryPath = path.join(
    productRoot,
    evidence.temporaryStateFileName,
  )
  const state = await lstatOutcome(statePath)
  if (state.status === 'unavailable') throw new ApplyFailure('unavailable')
  if (state.status === 'present') {
    if (!(await regularFileHasBytes(statePath, evidence.aggregateSha256))) {
      throw new ApplyFailure('conflict')
    }
  } else {
    const temporary = await lstatOutcome(temporaryPath)
    if (temporary.status === 'unavailable') {
      throw new ApplyFailure('unavailable')
    }
    if (temporary.status === 'present') {
      if (
        !(await regularFileHasBytes(
          temporaryPath,
          evidence.aggregateSha256,
        ))
      ) {
        throw new ApplyFailure('conflict')
      }
    } else {
      const bytes = encodeSemesterWorkspaceV3(evidence.aggregate)
      const handle = await openExclusiveFile(temporaryPath)
      try {
        await handle.writeFile(bytes)
        await inject(options, 'after_state_temp_write')
        await handle.sync()
        await inject(options, 'after_state_file_sync')
      } finally {
        await handle.close()
      }
    }
    await inject(options, 'before_state_publish')
    try {
      await link(temporaryPath, statePath)
    } catch (error) {
      if (hasErrnoCode(error, 'EEXIST')) {
        throw new ApplyFailure('conflict')
      }
      throw error
    }
    await inject(options, 'after_state_publish')
  }

  await syncDirectory(productRoot)
  await inject(options, 'after_state_directory_sync')
  if (await pathExists(temporaryPath)) {
    if (
      !(await regularFileHasBytes(
        temporaryPath,
        evidence.aggregateSha256,
      ))
    ) {
      throw new ApplyFailure('conflict')
    }
    await unlink(temporaryPath)
    await syncDirectory(productRoot)
  }

  await inject(options, 'before_state_readback')
  const readback = await readExpectedOwnedWorkspace(evidence)
  await inject(options, 'after_state_readback')

  const storedEvidence = await readAdmissionEvidence(root)
  if (
    !storedEvidence ||
    canonicalJson(storedEvidence) !== canonicalJson(evidence)
  ) {
    throw new ApplyFailure('conflict')
  }
  await unlink(path.join(productRoot, evidenceFileName))
  await syncDirectory(productRoot)
  await syncDirectory(root)
  await inject(options, 'after_evidence_removal')

  const final = await classifyRoot(root)
  if (
    final.status !== 'current_v3' ||
    final.hasEvidence ||
    final.workspace.workspaceId !== readback.workspaceId
  ) {
    throw new ApplyFailure('conflict')
  }
  return final.workspace
}

async function readExpectedOwnedWorkspace(
  evidence: AdmissionEvidence,
): Promise<AdmittedSemesterWorkspace> {
  if (
    !(await rootMatchesIdentity(
      evidence.canonicalRoot,
      evidence.rootIdentity,
    ))
  ) {
    throw new ApplyFailure('authority_changed')
  }
  for (const directory of ['inbox', 'courses']) {
    if (!(await isRegularDirectory(path.join(evidence.canonicalRoot, directory)))) {
      throw new ApplyFailure('conflict')
    }
  }
  const statePath = path.join(
    productRootPath(evidence.canonicalRoot),
    stateFileName,
  )
  const bytes = await readRegularFile(statePath)
  if (sha256(bytes) !== evidence.aggregateSha256) {
    throw new ApplyFailure('conflict')
  }
  const classification = classifySemesterWorkspaceStateBytes(bytes)
  if (
    classification.status !== 'current_v3' ||
    canonicalJson(classification.aggregate) !==
      canonicalJson(evidence.aggregate)
  ) {
    throw new ApplyFailure('conflict')
  }
  return admittedWorkspace(evidence.canonicalRoot, classification.aggregate)
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

  let bytes: Buffer
  try {
    bytes = await readRegularFile(statePath)
  } catch (error) {
    return error instanceof AdmissionFileTooLarge
      ? { status: 'incompatible' }
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

async function assertOwnedIncompleteEntries(
  evidence: AdmissionEvidence,
): Promise<void> {
  const rootEntries = await readdir(evidence.canonicalRoot)
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
  const productRoot = productRootPath(evidence.canonicalRoot)
  const productEntries = await readdir(productRoot)
  if (
    productEntries.some(
      (entry) =>
        entry !== evidenceFileName &&
        entry !== stateFileName &&
        entry !== evidence.temporaryStateFileName,
    )
  ) {
    throw new ApplyFailure('conflict')
  }
}

async function readAdmissionEvidence(
  canonicalRoot: string,
): Promise<AdmissionEvidence | null> {
  const markerPath = path.join(
    productRootPath(canonicalRoot),
    evidenceFileName,
  )
  const outcome = await lstatOutcome(markerPath)
  if (outcome.status !== 'present') return null
  if (!outcome.stats.isFile() || outcome.stats.isSymbolicLink()) return null
  try {
    return decodeAdmissionEvidence(
      JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(
          await readRegularFile(markerPath),
        ),
      ),
    )
  } catch {
    return null
  }
}

function evidenceFromCreateContext(
  context: CreatePlanContext,
  rootIdentity: FileIdentity,
): AdmissionEvidence {
  return {
    kind: evidenceKind,
    formatVersion: 1,
    setupId: context.plan.planId,
    authorityDigest: context.plan.authorityDigest,
    canonicalRoot: context.plan.canonicalRoot,
    rootIdentity,
    aggregate: context.aggregate,
    aggregateSha256: context.aggregateSha256,
    temporaryStateFileName: context.temporaryStateFileName,
  }
}

function decodeAdmissionEvidence(value: unknown): AdmissionEvidence {
  if (
    !isExactRecord(value, [
      'aggregate',
      'aggregateSha256',
      'authorityDigest',
      'canonicalRoot',
      'formatVersion',
      'kind',
      'rootIdentity',
      'setupId',
      'temporaryStateFileName',
    ]) ||
    value.kind !== evidenceKind ||
    value.formatVersion !== 1 ||
    !isOpaqueIdentity(value.setupId) ||
    !isSha256(value.authorityDigest) ||
    !isCanonicalAbsolutePath(value.canonicalRoot) ||
    !isFileIdentity(value.rootIdentity) ||
    !isSha256(value.aggregateSha256) ||
    !isSafeTemporaryStateName(value.temporaryStateFileName)
  ) {
    throw new TypeError('Invalid workspace admission evidence.')
  }
  const aggregate = decodeSemesterWorkspaceV3(value.aggregate)
  if (sha256(encodeSemesterWorkspaceV3(aggregate)) !== value.aggregateSha256) {
    throw new TypeError('Invalid workspace admission evidence.')
  }
  return {
    kind: evidenceKind,
    formatVersion: 1,
    setupId: value.setupId,
    authorityDigest: value.authorityDigest,
    canonicalRoot: value.canonicalRoot,
    rootIdentity: value.rootIdentity,
    aggregate,
    aggregateSha256: value.aggregateSha256,
    temporaryStateFileName: value.temporaryStateFileName,
  }
}

function encodeAdmissionEvidence(evidence: AdmissionEvidence): Buffer {
  return Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
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

async function ensureOwnedDirectory(directory: string): Promise<void> {
  const current = await lstatOutcome(directory)
  if (current.status === 'absent') {
    try {
      await mkdir(directory, { mode: directoryMode })
      return
    } catch (error) {
      if (!hasErrnoCode(error, 'EEXIST')) throw error
    }
  }
  if (
    current.status !== 'present' ||
    !current.stats.isDirectory() ||
    current.stats.isSymbolicLink()
  ) {
    throw new ApplyFailure('conflict')
  }
}

async function writeExclusiveSyncedFile(
  filePath: string,
  bytes: Uint8Array,
): Promise<void> {
  const handle = await openExclusiveFile(filePath)
  try {
    await handle.writeFile(bytes)
    await handle.sync()
  } finally {
    await handle.close()
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

async function readRegularFile(filePath: string): Promise<Buffer> {
  const handle = await open(
    filePath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  )
  try {
    const stats = await handle.stat()
    if (!stats.isFile()) throw new TypeError('Expected a regular file.')
    if (stats.size > admissionFileMaxBytes) {
      throw new AdmissionFileTooLarge()
    }
    return await handle.readFile()
  } finally {
    await handle.close()
  }
}

async function regularFileHasBytes(
  filePath: string,
  expectedSha256: string,
): Promise<boolean> {
  try {
    return sha256(await readRegularFile(filePath)) === expectedSha256
  } catch {
    return false
  }
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
  return {
    device: stats.dev.toString(),
    inode: stats.ino.toString(),
    birthtimeNs: stats.birthtimeNs.toString(),
  }
}

async function rootMatchesIdentity(
  root: string,
  expected: FileIdentity,
): Promise<boolean> {
  try {
    const actual = await directoryIdentity(root)
    return (
      actual.device === expected.device &&
      actual.inode === expected.inode &&
      actual.birthtimeNs === expected.birthtimeNs &&
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

function isFileIdentity(value: unknown): value is FileIdentity {
  return (
    isExactRecord(value, ['birthtimeNs', 'device', 'inode']) &&
    typeof value.device === 'string' &&
    /^[0-9]+$/.test(value.device) &&
    typeof value.inode === 'string' &&
    /^[0-9]+$/.test(value.inode) &&
    typeof value.birthtimeNs === 'string' &&
    /^[0-9]+$/.test(value.birthtimeNs)
  )
}

function isSafeTemporaryStateName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\.workspace-state\.json\.[0-9a-f]{32}\.tmp$/.test(value)
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

async function inject(
  options: SemesterWorkspaceAdmissionOptions,
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
