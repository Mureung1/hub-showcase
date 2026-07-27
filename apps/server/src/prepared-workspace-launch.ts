import { execFile } from 'node:child_process'
import { constants as fsConstants } from 'node:fs'
import { lstat, open, realpath } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import {
  decodeSemesterWorkspaceStateV4Bytes,
  SemesterWorkspaceV4CodecError,
  type SemesterWorkspaceStateV4,
} from '@ay-ple/semester-workspace'

import {
  createWorkspaceRegistryStore,
  WorkspaceRegistryStorageError,
} from './workspace-registry.js'

const execFileAsync = promisify(execFile)

export type PreparedWorkspaceLaunchSelection = {
  readonly status: 'selected'
  readonly source: 'explicit' | 'registry'
  readonly canonicalRoot: string
  readonly workspace: SemesterWorkspaceStateV4
}

export type PreparedWorkspaceLaunchFailure =
  | {
      readonly status: 'failure'
      readonly code: 'prepared_workspace_required'
    }
  | {
      readonly status: 'failure'
      readonly code: 'prepared_workspace_invalid'
      readonly reason: PreparedWorkspaceValidationFailure
    }
  | {
      readonly status: 'failure'
      readonly code: 'registered_workspace_unavailable'
      readonly workspaceId: string
      readonly reason:
        | PreparedWorkspaceValidationFailure
        | 'identity_mismatch'
    }
  | {
      readonly status: 'failure'
      readonly code: 'registry_incompatible'
      readonly reason: 'malformed' | 'unsupported'
    }

export type PreparedWorkspaceLaunchResult =
  | PreparedWorkspaceLaunchSelection
  | PreparedWorkspaceLaunchFailure

type PreparedWorkspaceValidationFailure =
  | 'root_unavailable'
  | 'root_not_canonical'
  | 'git_root_mismatch'
  | 'identity_incompatible'

type PreparedWorkspaceValidation =
  | {
      readonly status: 'valid'
      readonly canonicalRoot: string
      readonly workspace: SemesterWorkspaceStateV4
    }
  | {
      readonly status: 'invalid'
      readonly reason: PreparedWorkspaceValidationFailure
    }

export async function resolvePreparedWorkspaceLaunch(options: {
  readonly appDataRoot: string
  readonly explicitWorkspaceRoot?: string
}): Promise<PreparedWorkspaceLaunchResult> {
  if (options.explicitWorkspaceRoot !== undefined) {
    const explicit = await validatePreparedWorkspace(
      options.explicitWorkspaceRoot,
    )
    return explicit.status === 'valid'
      ? {
          status: 'selected',
          source: 'explicit',
          canonicalRoot: explicit.canonicalRoot,
          workspace: explicit.workspace,
        }
      : {
          status: 'failure',
          code: 'prepared_workspace_invalid',
          reason: explicit.reason,
        }
  }

  if (!(await existingCanonicalDirectory(options.appDataRoot))) {
    return { status: 'failure', code: 'prepared_workspace_required' }
  }
  let active
  try {
    active = await createWorkspaceRegistryStore({
      appDataRoot: options.appDataRoot,
    }).resolveActiveWorkspace()
  } catch (error) {
    if (error instanceof WorkspaceRegistryStorageError) {
      return {
        status: 'failure',
        code: 'registry_incompatible',
        reason: 'malformed',
      }
    }
    throw error
  }
  if (active.status === 'none') {
    return { status: 'failure', code: 'prepared_workspace_required' }
  }
  if (active.status === 'registry_incompatible') {
    return {
      status: 'failure',
      code: 'registry_incompatible',
      reason: active.reason,
    }
  }
  if (active.status === 'unavailable') {
    return {
      status: 'failure',
      code: 'registered_workspace_unavailable',
      workspaceId: active.workspaceId,
      reason: active.reason,
    }
  }

  const registered = await validatePreparedWorkspace(active.canonicalRoot)
  if (registered.status === 'invalid') {
    return {
      status: 'failure',
      code: 'registered_workspace_unavailable',
      workspaceId: active.workspace.workspaceId,
      reason: registered.reason,
    }
  }
  if (registered.workspace.workspaceId !== active.workspace.workspaceId) {
    return {
      status: 'failure',
      code: 'registered_workspace_unavailable',
      workspaceId: active.workspace.workspaceId,
      reason: 'identity_mismatch',
    }
  }
  return {
    status: 'selected',
    source: 'registry',
    canonicalRoot: registered.canonicalRoot,
    workspace: registered.workspace,
  }
}

async function validatePreparedWorkspace(
  configuredRoot: string,
): Promise<PreparedWorkspaceValidation> {
  if (
    !path.isAbsolute(configuredRoot) ||
    path.normalize(configuredRoot) !== configuredRoot
  ) {
    return { status: 'invalid', reason: 'root_not_canonical' }
  }
  let canonicalRoot: string
  try {
    const stats = await lstat(configuredRoot)
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      return { status: 'invalid', reason: 'root_unavailable' }
    }
    canonicalRoot = await realpath(configuredRoot)
  } catch {
    return { status: 'invalid', reason: 'root_unavailable' }
  }
  if (canonicalRoot !== configuredRoot) {
    return { status: 'invalid', reason: 'root_not_canonical' }
  }
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['-C', canonicalRoot, 'rev-parse', '--show-toplevel'],
      { encoding: 'utf8' },
    )
    if (stdout.trim() !== canonicalRoot) {
      return { status: 'invalid', reason: 'git_root_mismatch' }
    }
  } catch {
    return { status: 'invalid', reason: 'git_root_mismatch' }
  }

  let handle
  try {
    handle = await open(
      path.join(canonicalRoot, 'workspace-state.json'),
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    )
    const stats = await handle.stat()
    if (!stats.isFile() || stats.isSymbolicLink()) {
      return { status: 'invalid', reason: 'identity_incompatible' }
    }
    return {
      status: 'valid',
      canonicalRoot,
      workspace: decodeSemesterWorkspaceStateV4Bytes(
        await handle.readFile(),
      ),
    }
  } catch (error) {
    if (error instanceof SemesterWorkspaceV4CodecError) {
      return { status: 'invalid', reason: 'identity_incompatible' }
    }
    return { status: 'invalid', reason: 'identity_incompatible' }
  } finally {
    await handle?.close()
  }
}

async function existingCanonicalDirectory(
  directory: string,
): Promise<boolean> {
  if (!path.isAbsolute(directory) || path.normalize(directory) !== directory) {
    return false
  }
  try {
    const stats = await lstat(directory)
    return (
      stats.isDirectory() &&
      !stats.isSymbolicLink() &&
      (await realpath(directory)) === directory
    )
  } catch {
    return false
  }
}
