import { lstat, readdir } from 'node:fs/promises'
import path from 'node:path'

import type {
  AdmittedSemesterWorkspace,
  WorkspaceContextGuard,
  WorkspaceContextVerification,
  WorkspaceNativeContextSnapshot,
} from './contract.js'

const declaredSkillName = 'ay-ple-first-assignment'
const declaredSkillRoot = `.agents/skills/${declaredSkillName}`

export function createWorkspaceContextGuard(): WorkspaceContextGuard {
  return {
    verify({ workspace, native }): WorkspaceContextVerification {
      if (native.projectRootMarkers.length !== 0) {
        return { status: 'blocked', reason: 'config_conflict' }
      }
      if (native.globalInstructionsFile !== null) {
        return {
          status: 'blocked',
          reason: 'instruction_conflict',
        }
      }
      return verifyNativeSkill(workspace, native)
    },
  }
}

export async function verifyWorkspaceStaticContext(
  workspace: AdmittedSemesterWorkspace,
): Promise<WorkspaceContextVerification> {
  const instructionConflict = await entryState(
    path.join(workspace.canonicalRoot, 'AGENTS.override.md'),
  )
  if (instructionConflict !== 'absent') {
    return {
      status: 'blocked',
      reason: 'instruction_conflict',
    }
  }
  const configConflict = await entryState(
    path.join(workspace.canonicalRoot, '.codex'),
  )
  if (configConflict !== 'absent') {
    return { status: 'blocked', reason: 'config_conflict' }
  }

  const skillsRoot = path.join(
    workspace.canonicalRoot,
    '.agents',
    'skills',
  )
  const skillsState = await entryState(skillsRoot)
  if (skillsState === 'absent') {
    return { status: 'blocked', reason: 'skill_missing' }
  }
  if (skillsState !== 'directory') {
    return { status: 'blocked', reason: 'skill_conflict' }
  }
  try {
    const entries = await readdir(skillsRoot)
    if (
      entries.length !== 1 ||
      entries[0] !== declaredSkillName
    ) {
      return { status: 'blocked', reason: 'skill_conflict' }
    }
  } catch {
    return { status: 'blocked', reason: 'skill_conflict' }
  }
  return { status: 'verified' }
}

function verifyNativeSkill(
  workspace: AdmittedSemesterWorkspace,
  native: WorkspaceNativeContextSnapshot,
): WorkspaceContextVerification {
  const expectedRoot = path.join(
    workspace.canonicalRoot,
    declaredSkillRoot,
  )
  const declared = native.skills.filter(
    ({ name }) => name === declaredSkillName,
  )
  if (
    declared.length === 0 ||
    declared.every(({ enabled }) => !enabled)
  ) {
    return { status: 'blocked', reason: 'skill_missing' }
  }
  if (
    native.skills.length !== 1 ||
    declared.length !== 1 ||
    declared[0]!.sourceRoot !== expectedRoot
  ) {
    return { status: 'blocked', reason: 'skill_conflict' }
  }
  return { status: 'verified' }
}

async function entryState(
  target: string,
): Promise<'absent' | 'directory' | 'present' | 'unavailable'> {
  try {
    const stats = await lstat(target)
    if (stats.isDirectory() && !stats.isSymbolicLink()) {
      return 'directory'
    }
    return 'present'
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return 'absent'
    }
    return 'unavailable'
  }
}
