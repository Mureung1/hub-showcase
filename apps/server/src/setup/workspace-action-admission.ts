import {
  createSemesterWorkspaceAdmission,
  verifyWorkspaceBundle,
  verifyWorkspaceStaticContext,
  type AdmittedSemesterWorkspace,
  type SemesterWorkspaceAdmission,
  type VerifiedBundleSource,
  type WorkspaceActionAdmission,
  type WorkspaceActionAdmissionResult,
} from '@ay-ple/semester-workspace'

import type { WorkspaceNativeProjectBoundary } from './native-project-boundary.js'

export type WorkspaceActionReadiness =
  | 'ready'
  | 'workspace_not_ready'
  | 'setup_transition_active'

export interface WorkspaceActionReadinessPort {
  read(
    workspace: AdmittedSemesterWorkspace,
  ): Promise<WorkspaceActionReadiness>
}

export function createWorkspaceActionAdmission(input: {
  readonly source: VerifiedBundleSource
  readonly readiness: WorkspaceActionReadinessPort
  readonly nativeBoundary: WorkspaceNativeProjectBoundary
  readonly workspaceAdmission?: SemesterWorkspaceAdmission
}): WorkspaceActionAdmission {
  const workspaceAdmission =
    input.workspaceAdmission ?? createSemesterWorkspaceAdmission()

  return {
    async admit({ workspace, action }): Promise<WorkspaceActionAdmissionResult> {
      if (
        action !== 'academic' ||
        !sameWorkspace(workspace, input.nativeBoundary.workspace)
      ) {
        return blocked('workspace_not_ready')
      }

      const readiness = await readReadiness(input.readiness, workspace)
      if (readiness !== 'ready') return blocked(readiness)

      const freshWorkspace = await reopenSameWorkspace(
        workspaceAdmission,
        workspace,
      )
      if (!freshWorkspace) {
        return blocked('workspace_not_ready')
      }

      const bundle = await verifyWorkspaceBundle({
        workspace: freshWorkspace,
        source: input.source,
      })
      if (bundle.status !== 'verified') {
        return blocked('bundle_not_verified')
      }

      const staticContext =
        await verifyWorkspaceStaticContext(freshWorkspace)
      if (staticContext.status !== 'verified') {
        return blocked('context_not_verified')
      }
      let nativeContext
      try {
        nativeContext = await input.nativeBoundary.verify()
      } catch {
        return blocked('context_not_verified')
      }
      if (nativeContext.status !== 'verified') {
        return blocked('context_not_verified')
      }

      const finalReadiness = await readReadiness(
        input.readiness,
        freshWorkspace,
      )
      if (finalReadiness !== 'ready') {
        return blocked(finalReadiness)
      }

      const finalWorkspace = await reopenSameWorkspace(
        workspaceAdmission,
        workspace,
      )
      if (!finalWorkspace) {
        return blocked('workspace_not_ready')
      }
      let finalNativeContext
      try {
        finalNativeContext = await input.nativeBoundary.verify()
      } catch {
        return blocked('context_not_verified')
      }
      if (finalNativeContext.status !== 'verified') {
        return blocked('context_not_verified')
      }
      const finalBundle = await verifyWorkspaceBundle({
        workspace: finalWorkspace,
        source: input.source,
      })
      if (finalBundle.status !== 'verified') {
        return blocked('bundle_not_verified')
      }
      const finalStaticContext =
        await verifyWorkspaceStaticContext(finalWorkspace)
      if (finalStaticContext.status !== 'verified') {
        return blocked('context_not_verified')
      }
      return { status: 'admitted', workspace: finalWorkspace }
    },
  }
}

async function reopenSameWorkspace(
  admission: SemesterWorkspaceAdmission,
  workspace: AdmittedSemesterWorkspace,
): Promise<AdmittedSemesterWorkspace | null> {
  try {
    const inspection = await admission.inspect({
      kind: 'reopen',
      canonicalRoot: workspace.canonicalRoot,
    })
    if (
      (inspection.outcome !== 'admitted' &&
        inspection.outcome !== 'already_ready') ||
      !sameWorkspace(workspace, inspection.workspace)
    ) {
      return null
    }
    return inspection.workspace
  } catch {
    return null
  }
}

async function readReadiness(
  port: WorkspaceActionReadinessPort,
  workspace: AdmittedSemesterWorkspace,
): Promise<WorkspaceActionReadiness> {
  try {
    const readiness = await port.read(workspace)
    return readiness === 'ready' ||
      readiness === 'workspace_not_ready' ||
      readiness === 'setup_transition_active'
      ? readiness
      : 'workspace_not_ready'
  } catch {
    return 'workspace_not_ready'
  }
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
    left.manifest.workspaceId === right.manifest.workspaceId &&
    left.manifest.workspaceId === left.workspaceId &&
    right.manifest.workspaceId === right.workspaceId &&
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

function blocked(
  reason: Extract<
    WorkspaceActionAdmissionResult,
    { readonly status: 'blocked' }
  >['reason'],
): WorkspaceActionAdmissionResult {
  return { status: 'blocked', reason }
}
