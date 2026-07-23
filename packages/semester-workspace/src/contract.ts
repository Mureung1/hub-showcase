export type SemesterIdentity = {
  readonly yearLevel: number
  readonly term: {
    readonly key: string
    readonly displayName: string
  }
}

export type WorkspaceManifest = {
  readonly workspaceId: string
  readonly semester: SemesterIdentity
  readonly courses: readonly []
}

export type SemesterWorkspaceV3 = {
  readonly kind: 'ay-ple.semester-workspace'
  readonly formatVersion: 3
  readonly manifest: WorkspaceManifest
  readonly state: {
    readonly settings: Readonly<Record<never, never>>
    readonly confirmedRevision: 0
    readonly materials: readonly []
    readonly assignments: readonly []
    readonly statePatches: readonly []
    readonly userConfirmations: readonly []
    readonly modelingRuns: readonly []
    readonly executionGuard: null
    readonly sourceRecovery: null
  }
}

export type WorkspaceBundleEntryDescriptor = {
  readonly relativePath: string
  readonly type: 'file'
  readonly mode: '0644'
  readonly bytes: number
  readonly sha256: string
}

export type WorkspaceBundleRootDescriptor = {
  readonly kind: 'instructions' | 'skill'
  readonly root: string
  readonly skillName: string | null
  readonly entries: readonly WorkspaceBundleEntryDescriptor[]
  readonly completeTreeSha256: string
}

export type WorkspaceBundleDescriptor = {
  readonly schemaVersion: 1
  readonly bundleId: string
  readonly roots: readonly WorkspaceBundleRootDescriptor[]
  readonly completeTreeSha256: string
}

export type VerifiedBundleFile = {
  readonly relativePath: string
  readonly mode: '0644'
  readonly bytes: Uint8Array
  readonly sha256: string
}

export type VerifiedBundleSource = {
  readonly descriptor: WorkspaceBundleDescriptor
  readonly descriptorSha256: string
  readonly completeTreeSha256: string
  readonly files: readonly VerifiedBundleFile[]
}

export type SemesterSetupInput = {
  readonly yearLevel: number
  readonly term: {
    readonly key: string
    readonly displayName: string
  }
  readonly parentSelectionId: string
  readonly leafName: string
}

export type WorkspaceParentAuthority = {
  readonly selectionId: string
  readonly canonicalParent: string
  readonly parentDevice: string
  readonly parentInode: string
}

export type WorkspaceIntent =
  | {
      readonly kind: 'create'
      readonly parent: WorkspaceParentAuthority
      readonly semester: SemesterIdentity
      readonly leafName: string
    }
  | {
      readonly kind: 'reopen'
      readonly canonicalRoot: string
    }
  | {
      readonly kind: 'resume_owned'
      readonly setupId: string
      readonly canonicalRoot: string
    }
  | {
      readonly kind: 'discard_owned'
      readonly setupId: string
      readonly canonicalRoot: string
    }

export type AuthorityBoundWorkspacePlan = {
  readonly planId: string
  readonly operation: 'create' | 'reopen' | 'resume_owned' | 'discard_owned'
  readonly canonicalRoot: string
  readonly authorityDigest: string
}

export type WorkspaceAdmissionPlanDescription = {
  readonly setupPlanId: string
  readonly privateBinding: {
    readonly plan: {
      readonly canonicalBytesSha256: string
      readonly semester: SemesterIdentity
      readonly target: {
        readonly canonicalParent: string
        readonly parentDevice: string
        readonly parentInode: string
        readonly leafName: string
        readonly canonicalTarget: string
      }
    }
    readonly workspace: {
      readonly workspaceId: string
      readonly formatVersion: 3
      readonly rootMarkerSha256: string
      readonly ownedScaffoldPlanSha256: string
      readonly expectedInitialAggregateSha256: string
    }
  }
}

export type AdmittedSemesterWorkspace = {
  readonly canonicalRoot: string
  readonly workspaceId: string
  readonly formatVersion: 3
  readonly manifest: WorkspaceManifest
}

export type WorkspaceInspectionOutcome =
  | 'new_target'
  | 'admitted'
  | 'already_ready'
  | 'workspace_exists'
  | 'owned_incomplete'
  | 'legacy_migration_required'
  | 'collision'
  | 'incompatible'
  | 'unsafe'
  | 'unavailable'

export type WorkspaceInspection =
  | {
      readonly outcome: 'new_target' | 'owned_incomplete'
      readonly plan: AuthorityBoundWorkspacePlan
    }
  | {
      readonly outcome: 'admitted' | 'already_ready'
      readonly workspace: AdmittedSemesterWorkspace
    }
  | {
      readonly outcome:
        | 'workspace_exists'
        | 'collision'
        | 'unsafe'
        | 'unavailable'
      readonly readOnly: false
    }
  | {
      readonly outcome: 'legacy_migration_required' | 'incompatible'
      readonly readOnly: true
    }

export type WorkspaceApplyResult =
  | {
      readonly outcome: 'created' | 'resumed' | 'reopened'
      readonly workspace: AdmittedSemesterWorkspace
    }
  | { readonly outcome: 'discarded' }
  | {
      readonly outcome: 'authority_changed' | 'conflict' | 'unavailable'
    }

export interface SemesterWorkspaceAdmission {
  inspect(intent: WorkspaceIntent): Promise<WorkspaceInspection>
  describe(
    plan: AuthorityBoundWorkspacePlan,
  ): WorkspaceAdmissionPlanDescription | null
  apply(plan: AuthorityBoundWorkspacePlan): Promise<WorkspaceApplyResult>
}

export type WorkspaceActionAdmissionResult =
  | {
      readonly status: 'admitted'
      readonly workspace: AdmittedSemesterWorkspace
    }
  | {
      readonly status: 'blocked'
      readonly reason:
        | 'setup_transition_active'
        | 'workspace_not_ready'
        | 'bundle_not_verified'
        | 'context_not_verified'
    }

export interface WorkspaceActionAdmission {
  admit(input: {
    readonly workspace: AdmittedSemesterWorkspace
    readonly action: 'academic'
  }): Promise<WorkspaceActionAdmissionResult>
}

export type WorkspaceNativeContextSnapshot = {
  readonly projectRootMarkers: readonly string[]
  readonly globalInstructionsFile: string | null
  readonly skills: readonly {
    readonly name: string
    readonly enabled: boolean
    readonly sourceRoot: string
  }[]
}

export type WorkspaceContextVerification =
  | { readonly status: 'verified' }
  | {
      readonly status: 'blocked'
      readonly reason:
        | 'config_conflict'
        | 'skill_missing'
        | 'skill_conflict'
        | 'instruction_conflict'
    }

export interface WorkspaceContextGuard {
  verify(input: {
    readonly workspace: AdmittedSemesterWorkspace
    readonly native: WorkspaceNativeContextSnapshot
  }): WorkspaceContextVerification
}

export type LaunchBinding = {
  readonly application: {
    readonly packageName: 'ay-ple'
    readonly packageVersion: string
  }
  readonly runtime: {
    readonly releaseDescriptorSha256: string
    readonly manifestSha256: string
    readonly releaseId: string
    readonly target: 'darwin-arm64'
    readonly runtimeContractVersion: number
  }
  readonly bundle: {
    readonly descriptorSha256: string
    readonly completeTreeSha256: string
  }
}

export type PendingSetupReceipt = {
  readonly setupId: string
  readonly setupPlanId: string
  readonly lifecycle:
    | { readonly phase: 'approved' }
    | { readonly phase: 'prepared' }
    | {
        readonly phase: 'discard_requested'
        readonly rootFileIdentity: {
          readonly device: string
          readonly inode: string
          readonly birthtimeNs: string
        }
      }
  readonly plan: {
    readonly canonicalBytesSha256: string
    readonly semester: SemesterIdentity
    readonly target: {
      readonly canonicalParent: string
      readonly parentDevice: string
      readonly parentInode: string
      readonly leafName: string
      readonly canonicalTarget: string
    }
  }
  readonly release: LaunchBinding
  readonly workspace: {
    readonly workspaceId: string
    readonly formatVersion: 3
    readonly rootMarkerSha256: string
    readonly ownedScaffoldPlanSha256: string
    readonly expectedInitialAggregateSha256: string
  }
}

export type ActiveReadyPointer = {
  readonly setupId: string
  readonly release: LaunchBinding
  readonly workspace: {
    readonly canonicalRoot: string
    readonly workspaceId: string
    readonly formatVersion: 3
  }
}

export type SetupStateEnvelope = {
  readonly formatVersion: 1
  readonly revision: number
  readonly state:
    | { readonly kind: 'empty' }
    | { readonly kind: 'pending'; readonly receipt: PendingSetupReceipt }
    | { readonly kind: 'active_ready'; readonly pointer: ActiveReadyPointer }
}

export type SetupEnvelopeRead =
  | { readonly status: 'absent' }
  | {
      readonly status: 'current'
      readonly envelope: SetupStateEnvelope
      readonly revisionToken: string
    }
  | {
      readonly status: 'incompatible'
      readonly reason: 'missing_state' | 'malformed' | 'unsupported'
    }

export type SetupEnvelopeWriteResult =
  | {
      readonly status: 'written'
      readonly envelope: SetupStateEnvelope
      readonly revisionToken: string
    }
  | { readonly status: 'conflict' }

export interface SetupEnvelopeStore {
  read(): Promise<SetupEnvelopeRead>
  compareAndReplace(input: {
    readonly expectedRevisionToken: string | null
    readonly envelope: SetupStateEnvelope
  }): Promise<SetupEnvelopeWriteResult>
}

export type SetupCommand =
  | { readonly kind: 'launch' }
  | { readonly kind: 'prepare'; readonly input: SemesterSetupInput }
  | { readonly kind: 'approve'; readonly setupPlanId: string }
  | {
      readonly kind: 'recover'
      readonly recoveryId: string
      readonly action: 'resume' | 'discard'
    }

export type SetupReconcileOutcome =
  | 'awaiting_input'
  | 'awaiting_approval'
  | 'resumed'
  | 'ready_created'
  | 'already_ready'
  | 'ready_relaunch'
  | 'discarded'
  | 'setup_conflict'
  | 'setup_state_conflict'
  | 'setup_release_mismatch'
  | 'recovery_required'
  | 'reauth_required'
  | 'setup_transition_unavailable'
  | 'account_unavailable'
  | 'cancelled'

export type SetupReconcileResult<TProjection> = {
  readonly outcome: SetupReconcileOutcome
  readonly projection: TProjection
}

export interface SetupJourney<TProjection> {
  reconcile(
    command: SetupCommand,
  ): Promise<SetupReconcileResult<TProjection>>
  observe(): TProjection
}

export class WorkspaceBundleContractError extends TypeError {
  constructor() {
    super('The workspace bundle descriptor is invalid.')
    this.name = 'WorkspaceBundleContractError'
  }
}

export function decodeWorkspaceBundleDescriptor(
  value: unknown,
): WorkspaceBundleDescriptor {
  if (
    !isExactObject(value, [
      'bundleId',
      'completeTreeSha256',
      'roots',
      'schemaVersion',
    ]) ||
    value.schemaVersion !== 1 ||
    !isNonEmptyString(value.bundleId) ||
    !isSha256(value.completeTreeSha256) ||
    !Array.isArray(value.roots)
  ) {
    throw invalidBundle()
  }
  const roots = value.roots.map(decodeBundleRoot)
  if (
    roots.length !== 2 ||
    roots[0]?.kind !== 'instructions' ||
    roots[0].root !== 'AGENTS.md' ||
    roots[1]?.kind !== 'skill' ||
    roots[1].root !== '.agents/skills/ay-ple-first-assignment' ||
    roots[1].skillName !== 'ay-ple-first-assignment'
  ) {
    throw invalidBundle()
  }
  return {
    schemaVersion: 1,
    bundleId: value.bundleId,
    roots,
    completeTreeSha256: value.completeTreeSha256,
  }
}

function decodeBundleRoot(value: unknown): WorkspaceBundleRootDescriptor {
  if (
    !isExactObject(value, [
      'completeTreeSha256',
      'entries',
      'kind',
      'root',
      'skillName',
    ]) ||
    (value.kind !== 'instructions' && value.kind !== 'skill') ||
    !isSafeRelativePath(value.root) ||
    !isSha256(value.completeTreeSha256) ||
    !Array.isArray(value.entries) ||
    (value.skillName !== null && !isNonEmptyString(value.skillName))
  ) {
    throw invalidBundle()
  }
  if (
    (value.kind === 'instructions' && value.skillName !== null) ||
    (value.kind === 'skill' && value.skillName === null)
  ) {
    throw invalidBundle()
  }
  const entries = value.entries.map(decodeBundleEntry)
  const paths = entries.map(({ relativePath }) => relativePath)
  if (
    entries.length === 0 ||
    new Set(paths).size !== paths.length ||
    paths.join('\0') !== [...paths].sort().join('\0')
  ) {
    throw invalidBundle()
  }
  return {
    kind: value.kind,
    root: value.root,
    skillName: value.skillName,
    entries,
    completeTreeSha256: value.completeTreeSha256,
  }
}

function decodeBundleEntry(value: unknown): WorkspaceBundleEntryDescriptor {
  if (
    !isExactObject(value, [
      'bytes',
      'mode',
      'relativePath',
      'sha256',
      'type',
    ]) ||
    !isSafeRelativePath(value.relativePath) ||
    value.type !== 'file' ||
    value.mode !== '0644' ||
    !Number.isSafeInteger(value.bytes) ||
    Number(value.bytes) < 0 ||
    !isSha256(value.sha256)
  ) {
    throw invalidBundle()
  }
  return {
    relativePath: value.relativePath,
    type: 'file',
    mode: '0644',
    bytes: Number(value.bytes),
    sha256: value.sha256,
  }
}

function isExactObject(
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

function isSafeRelativePath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !value.startsWith('/') &&
    !value.includes('\\') &&
    !value.split('/').some((part) => part === '' || part === '..')
  )
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
}

function invalidBundle(): WorkspaceBundleContractError {
  return new WorkspaceBundleContractError()
}
