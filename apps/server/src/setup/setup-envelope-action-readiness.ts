import type {
  ActiveReadyPointer,
  AdmittedSemesterWorkspace,
  LaunchBinding,
  SetupEnvelopeStore,
} from '@ay-ple/semester-workspace'

import type {
  WorkspaceReadyAttestationPort,
} from './lease-bound-ready-transition.js'
import type {
  WorkspaceActionReadinessPort,
} from './workspace-action-admission.js'

export function createSetupEnvelopeActionReadiness(input: {
  readonly stateStore: SetupEnvelopeStore
  readonly release: LaunchBinding
  readonly transitionAttestation: WorkspaceReadyAttestationPort
}): WorkspaceActionReadinessPort {
  return {
    async read(workspace) {
      const attestation = input.transitionAttestation.read(workspace)
      if (attestation.state === 'active') {
        return 'setup_transition_active'
      }
      if (attestation.state !== 'confirmed') {
        return 'workspace_not_ready'
      }
      try {
        const observed = await input.stateStore.read()
        if (
          observed.status !== 'current' ||
          observed.envelope.state.kind !== 'active_ready' ||
          !sameReadyPointer(
            observed.envelope.state.pointer,
            workspace,
            input.release,
          ) ||
          !samePointer(
            observed.envelope.state.pointer,
            attestation.ready,
          )
        ) {
          return 'workspace_not_ready'
        }
        const finalAttestation =
          input.transitionAttestation.read(workspace)
        if (finalAttestation.state === 'active') {
          return 'setup_transition_active'
        }
        if (
          finalAttestation.state !== 'confirmed' ||
          !samePointer(
            observed.envelope.state.pointer,
            finalAttestation.ready,
          )
        ) {
          return 'workspace_not_ready'
        }
        return 'ready'
      } catch {
        return 'workspace_not_ready'
      }
    },
  }
}

function samePointer(
  left: ActiveReadyPointer,
  right: ActiveReadyPointer,
): boolean {
  return (
    left.setupId === right.setupId &&
    left.workspace.canonicalRoot === right.workspace.canonicalRoot &&
    left.workspace.workspaceId === right.workspace.workspaceId &&
    left.workspace.formatVersion === 3 &&
    right.workspace.formatVersion === 3 &&
    sameRelease(left.release, right.release)
  )
}

function sameReadyPointer(
  pointer: ActiveReadyPointer,
  workspace: AdmittedSemesterWorkspace,
  release: LaunchBinding,
): boolean {
  return (
    pointer.workspace.canonicalRoot === workspace.canonicalRoot &&
    pointer.workspace.workspaceId === workspace.workspaceId &&
    pointer.workspace.formatVersion === 3 &&
    workspace.formatVersion === 3 &&
    workspace.workspaceId === workspace.manifest.workspaceId &&
    workspace.manifest.courses.length === 0 &&
    sameRelease(pointer.release, release)
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
