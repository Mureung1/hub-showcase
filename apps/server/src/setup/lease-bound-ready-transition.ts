import type {
  CodexFreshAccount,
} from '@ay-ple/codex-chat-runtime'
import {
  SemesterReadyValidationError,
} from '@ay-ple/semester-workspace'
import type {
  ActiveReadyPointer,
  AdmittedSemesterWorkspace,
  SemesterReadyTransitionPort,
  SemesterReadyTransitionResult,
} from '@ay-ple/semester-workspace'

import type {
  AccountRuntimeTransitionLease,
} from '../account-runtime/contract.js'
import type {
  WorkspaceNativeProjectBoundary,
} from './native-project-boundary.js'

type CallbackFailure =
  | 'bundle_missing'
  | 'cancelled'
  | 'context_conflict'
  | 'ready_commit_unknown'
  | 'reauth_required'

export type WorkspaceReadyAttestation =
  | { readonly state: 'active' }
  | { readonly state: 'unconfirmed' }
  | {
      readonly state: 'confirmed'
      readonly ready: ActiveReadyPointer
    }

export interface WorkspaceReadyAttestationPort {
  read(workspace: AdmittedSemesterWorkspace): WorkspaceReadyAttestation
}

export interface LeaseBoundReadyTransition
  extends SemesterReadyTransitionPort {
  readonly attestation: WorkspaceReadyAttestationPort
}

export function createLeaseBoundReadyTransition(input: {
  readonly lease: AccountRuntimeTransitionLease<
    CodexFreshAccount,
    AdmittedSemesterWorkspace,
    ActiveReadyPointer
  >
  readonly createNativeBoundary: (
    workspace: AdmittedSemesterWorkspace,
  ) => WorkspaceNativeProjectBoundary
  readonly transitionSignal?: () => AbortSignal
}): LeaseBoundReadyTransition {
  const active = new Map<string, number>()
  const confirmed = new Map<string, ActiveReadyPointer>()
  let activeCount = 0
  return {
    attestation: {
      read(workspace) {
        const key = workspaceKey(workspace)
        if (activeCount > 0) {
          return { state: 'active' }
        }
        const ready = confirmed.get(key)
        return ready
          ? { state: 'confirmed', ready: cloneReadyPointer(ready) }
          : { state: 'unconfirmed' }
      },
    },
    async transition(request): Promise<SemesterReadyTransitionResult> {
      const key = workspaceKey(request.workspace)
      confirmed.delete(key)
      active.set(key, (active.get(key) ?? 0) + 1)
      activeCount += 1
      let attested = false
      try {
        const signal =
          input.transitionSignal?.() ?? new AbortController().signal
        let callbackFailure: CallbackFailure | undefined
        let commitEntered = false
        const transitioned = await input.lease.transitionToWorkspace({
          workspace: request.workspace,
          signal,
          async commitReady({ workspace, account }) {
            if (account.state !== 'chatgpt') {
              callbackFailure = 'reauth_required'
              throw new Error('Workspace account is not ChatGPT')
            }
            let boundary: WorkspaceNativeProjectBoundary
            try {
              boundary = input.createNativeBoundary(workspace)
            } catch {
              callbackFailure = signal.aborted
                ? 'cancelled'
                : 'context_conflict'
              throw new Error('Native project boundary is unavailable')
            }
            if (!sameWorkspace(boundary.workspace, workspace)) {
              callbackFailure = 'context_conflict'
              throw new Error(
                'Native project boundary changed workspace',
              )
            }
            let verified
            try {
              verified = await boundary.verify({ signal })
            } catch {
              callbackFailure = signal.aborted
                ? 'cancelled'
                : 'context_conflict'
              throw new Error(
                'Native project boundary verification failed',
              )
            }
            if (signal.aborted) {
              callbackFailure = 'cancelled'
              throw new Error('Ready transition was cancelled')
            }
            if (verified.status !== 'verified') {
              callbackFailure = 'context_conflict'
              throw new Error('Native project boundary is not verified')
            }
            commitEntered = true
            try {
              const committed = await request.commitReady()
              if (
                !sameReadyPointer(
                  committed,
                  request.expectedReady,
                )
              ) {
                throw new Error('Ready commit returned another pointer')
              }
              return committed
            } catch (error) {
              if (error instanceof SemesterReadyValidationError) {
                callbackFailure = error.reason
                throw error
              }
              try {
                return await readExpectedReady(request)
              } catch {
                callbackFailure = 'ready_commit_unknown'
                throw new Error('Ready commit outcome is unknown')
              }
            }
          },
          async readReady() {
            if (!commitEntered && signal.aborted) {
              callbackFailure = 'cancelled'
              throw new Error('Ready transition was cancelled')
            }
            try {
              return await readExpectedReady(request)
            } catch {
              callbackFailure = 'ready_commit_unknown'
              throw new Error('Ready readback outcome is unknown')
            }
          },
        })

        if (transitioned.status === 'ready') {
          if (
            !sameReadyPointer(
              transitioned.ready,
              request.expectedReady,
            )
          ) {
            return { status: 'ready_commit_unknown' }
          }
          confirmed.set(key, cloneReadyPointer(transitioned.ready))
          attested = true
          return { status: 'ready', ready: transitioned.ready }
        }
        if (callbackFailure) return { status: callbackFailure }
        switch (transitioned.error.code) {
          case 'workspace_account_reauth_required':
            return { status: 'reauth_required' }
          case 'account_unavailable':
            return { status: 'account_unavailable' }
          case 'transition_cancelled':
            return { status: 'cancelled' }
          case 'account_operation_active':
            return {
              status: 'transition_unavailable',
              retry: 'resume',
            }
          case 'auth_runtime_close_ambiguous':
          case 'coordinator_closed':
          case 'workspace_runtime_start_failed':
            return {
              status: 'transition_unavailable',
              retry: 'restart_required',
            }
        }
      } finally {
        if (!attested) confirmed.delete(key)
        const remaining = (active.get(key) ?? 1) - 1
        activeCount -= 1
        if (remaining === 0) {
          active.delete(key)
        } else {
          active.set(key, remaining)
        }
      }
    },
  }
}

async function readExpectedReady(input: {
  readonly expectedReady: ActiveReadyPointer
  readonly readReady: () => Promise<ActiveReadyPointer>
}): Promise<ActiveReadyPointer> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const ready = await input.readReady()
      if (sameReadyPointer(ready, input.expectedReady)) {
        return ready
      }
    } catch {
      // A bounded read-only retry remains inside the A1 lease.
    }
  }
  throw new Error('The exact Ready pointer could not be read back')
}

function workspaceKey(workspace: AdmittedSemesterWorkspace): string {
  return `${workspace.canonicalRoot}\0${workspace.workspaceId}`
}

function cloneReadyPointer(
  pointer: ActiveReadyPointer,
): ActiveReadyPointer {
  return {
    setupId: pointer.setupId,
    release: {
      application: { ...pointer.release.application },
      runtime: { ...pointer.release.runtime },
      bundle: { ...pointer.release.bundle },
    },
    workspace: { ...pointer.workspace },
  }
}

function sameReadyPointer(
  left: ActiveReadyPointer,
  right: ActiveReadyPointer,
): boolean {
  return (
    left.setupId === right.setupId &&
    sameWorkspacePointer(left, right) &&
    sameRelease(left.release, right.release)
  )
}

function sameRelease(
  left: ActiveReadyPointer['release'],
  right: ActiveReadyPointer['release'],
): boolean {
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

function sameWorkspacePointer(
  left: ActiveReadyPointer,
  right: ActiveReadyPointer,
): boolean {
  return (
    left.workspace.canonicalRoot === right.workspace.canonicalRoot &&
    left.workspace.workspaceId === right.workspace.workspaceId &&
    left.workspace.formatVersion === 3 &&
    right.workspace.formatVersion === 3
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
