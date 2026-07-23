import { lstat, realpath } from 'node:fs/promises'
import path from 'node:path'

import {
  createWorkspaceContextGuard,
  verifyWorkspaceStaticContext,
  type AdmittedSemesterWorkspace,
  type WorkspaceContextVerification,
  type WorkspaceNativeContextSnapshot,
} from '@ay-ple/semester-workspace'

export type WorkspaceNativeEffectiveConfig = {
  readonly projectRootMarkers: readonly string[]
  readonly globalInstructionsFile: string | null
}

export type WorkspaceNativeEffectiveSkill = {
  readonly name: string
  readonly enabled: boolean
  readonly sourceRoot: string
}

export interface WorkspaceNativeContextPort {
  readEffectiveConfig(input: {
    readonly signal: AbortSignal
  }): Promise<WorkspaceNativeEffectiveConfig>
  listEffectiveSkills(input: {
    readonly signal: AbortSignal
  }): Promise<readonly WorkspaceNativeEffectiveSkill[]>
}

export interface WorkspaceNativeContextQueryPort {
  readConfig(input: {
    readonly method: 'config/read'
    readonly cwd: string
    readonly includeLayers: true
    readonly signal: AbortSignal
  }): Promise<WorkspaceNativeEffectiveConfig>
  listSkills(input: {
    readonly method: 'skills/list'
    readonly cwds: readonly [string]
    readonly forceReload: true
    readonly signal: AbortSignal
  }): Promise<readonly WorkspaceNativeEffectiveSkill[]>
}

export type WorkspaceNativeLaunch = {
  readonly cwd: string
  readonly environment: {
    readonly HOME: string
    readonly CODEX_HOME: string
  }
  readonly configOverrides: readonly ['project_root_markers=[]']
}

export type WorkspaceNativeBoundaryVerification =
  | { readonly status: 'verified' }
  | Extract<WorkspaceContextVerification, { readonly status: 'blocked' }>

export interface WorkspaceNativeProjectBoundary {
  readonly workspace: AdmittedSemesterWorkspace
  readonly launch: WorkspaceNativeLaunch
  verify(): Promise<WorkspaceNativeBoundaryVerification>
}

export function createWorkspaceNativeContextPort(input: {
  readonly workspaceRoot: string
  readonly queryPort: WorkspaceNativeContextQueryPort
}): WorkspaceNativeContextPort {
  const workspaceRoot = input.workspaceRoot
  return {
    readEffectiveConfig({ signal }) {
      return input.queryPort.readConfig({
        method: 'config/read',
        cwd: workspaceRoot,
        includeLayers: true,
        signal,
      })
    },
    listEffectiveSkills({ signal }) {
      return input.queryPort.listSkills({
        method: 'skills/list',
        cwds: [workspaceRoot],
        forceReload: true,
        signal,
      })
    },
  }
}

export function createWorkspaceNativeProjectBoundary(input: {
  readonly workspace: AdmittedSemesterWorkspace
  readonly controlledHome: string
  readonly controlledCodexHome: string
  readonly nativeContext: WorkspaceNativeContextPort
}): WorkspaceNativeProjectBoundary {
  const workspace = cloneWorkspace(input.workspace)
  const launch = deepFreezeLaunch({
    cwd: workspace.canonicalRoot,
    environment: {
      HOME: input.controlledHome,
      CODEX_HOME: input.controlledCodexHome,
    },
    configOverrides: ['project_root_markers=[]'],
  })

  return {
    workspace,
    launch,
    async verify(): Promise<WorkspaceNativeBoundaryVerification> {
      const rootVerification = await verifyControlledRoots(launch)
      if (rootVerification.status === 'blocked') {
        return rootVerification
      }
      const staticContext = await verifyWorkspaceStaticContext(
        workspace,
      )
      if (staticContext.status === 'blocked') return staticContext

      const controller = new AbortController()
      let config: WorkspaceNativeEffectiveConfig
      try {
        config = cloneEffectiveConfig(
          await input.nativeContext.readEffectiveConfig({
            signal: controller.signal,
          }),
        )
      } catch {
        return { status: 'blocked', reason: 'config_conflict' }
      }
      let skills: readonly WorkspaceNativeEffectiveSkill[]
      try {
        skills = cloneEffectiveSkills(
          await input.nativeContext.listEffectiveSkills({
            signal: controller.signal,
          }),
        )
      } catch {
        return { status: 'blocked', reason: 'skill_conflict' }
      }
      const native = cloneNativeSnapshot({ config, skills })
      const verified = createWorkspaceContextGuard().verify({
        workspace,
        native,
      })
      if (verified.status === 'blocked') return verified
      const finalRootVerification = await verifyControlledRoots(launch)
      if (finalRootVerification.status === 'blocked') {
        return finalRootVerification
      }
      const finalStaticContext =
        await verifyWorkspaceStaticContext(workspace)
      if (finalStaticContext.status === 'blocked') {
        return finalStaticContext
      }
      return { status: 'verified' }
    },
  }
}

async function verifyControlledRoots(
  launch: WorkspaceNativeLaunch,
): Promise<WorkspaceContextVerification> {
  const roots = [
    launch.cwd,
    launch.environment.HOME,
    launch.environment.CODEX_HOME,
  ]
  if (new Set(roots).size !== roots.length) {
    return { status: 'blocked', reason: 'config_conflict' }
  }
  for (const root of roots) {
    if (!(await isExactCanonicalDirectory(root))) {
      return { status: 'blocked', reason: 'config_conflict' }
    }
  }
  for (let left = 0; left < roots.length; left += 1) {
    for (let right = left + 1; right < roots.length; right += 1) {
      if (
        contains(roots[left]!, roots[right]!) ||
        contains(roots[right]!, roots[left]!)
      ) {
        return { status: 'blocked', reason: 'config_conflict' }
      }
    }
  }

  const conflicts = [
    {
      target: path.join(launch.environment.HOME, 'AGENTS.md'),
      reason: 'instruction_conflict',
    },
    {
      target: path.join(
        launch.environment.HOME,
        'AGENTS.override.md',
      ),
      reason: 'instruction_conflict',
    },
    {
      target: path.join(launch.environment.HOME, '.agents'),
      reason: 'skill_conflict',
    },
    {
      target: path.join(launch.environment.HOME, '.codex'),
      reason: 'config_conflict',
    },
    {
      target: path.join(
        launch.environment.CODEX_HOME,
        'AGENTS.md',
      ),
      reason: 'instruction_conflict',
    },
    {
      target: path.join(
        launch.environment.CODEX_HOME,
        'AGENTS.override.md',
      ),
      reason: 'instruction_conflict',
    },
    {
      target: path.join(launch.environment.CODEX_HOME, '.agents'),
      reason: 'skill_conflict',
    },
    {
      target: path.join(launch.environment.CODEX_HOME, 'skills'),
      reason: 'skill_conflict',
    },
  ] as const
  for (const conflict of conflicts) {
    if (await entryExistsOrIsUnavailable(conflict.target)) {
      return { status: 'blocked', reason: conflict.reason }
    }
  }
  return { status: 'verified' }
}

async function isExactCanonicalDirectory(
  target: string,
): Promise<boolean> {
  if (!path.isAbsolute(target)) return false
  try {
    const stats = await lstat(target)
    return (
      stats.isDirectory() &&
      !stats.isSymbolicLink() &&
      (await realpath(target)) === path.resolve(target)
    )
  } catch {
    return false
  }
}

async function entryExistsOrIsUnavailable(
  target: string,
): Promise<boolean> {
  try {
    await lstat(target)
    return true
  } catch (error) {
    return !(
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    )
  }
}

function contains(parent: string, child: string): boolean {
  const relative = path.relative(parent, child)
  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  )
}

function cloneWorkspace(
  workspace: AdmittedSemesterWorkspace,
): AdmittedSemesterWorkspace {
  return Object.freeze({
    canonicalRoot: workspace.canonicalRoot,
    workspaceId: workspace.workspaceId,
    formatVersion: 3,
    manifest: Object.freeze({
      workspaceId: workspace.manifest.workspaceId,
      semester: Object.freeze({
        yearLevel: workspace.manifest.semester.yearLevel,
        term: Object.freeze({
          key: workspace.manifest.semester.term.key,
          displayName: workspace.manifest.semester.term.displayName,
        }),
      }),
      courses: Object.freeze([]) as readonly [],
    }),
  })
}

function cloneNativeSnapshot(input: {
  readonly config: WorkspaceNativeEffectiveConfig
  readonly skills: readonly WorkspaceNativeEffectiveSkill[]
}): WorkspaceNativeContextSnapshot {
  const projectRootMarkers = Object.freeze([
    ...input.config.projectRootMarkers,
  ])
  const skills = Object.freeze(
    input.skills.map((skill) =>
      Object.freeze({
        name: skill.name,
        enabled: skill.enabled,
        sourceRoot: skill.sourceRoot,
      }),
    ),
  )
  return Object.freeze({
    projectRootMarkers,
    globalInstructionsFile: input.config.globalInstructionsFile,
    skills,
  })
}

function cloneEffectiveConfig(
  value: unknown,
): WorkspaceNativeEffectiveConfig {
  if (typeof value !== 'object' || value === null) {
    throw new Error('invalid native config')
  }
  const config = value as Record<string, unknown>
  if (
    !Array.isArray(config.projectRootMarkers) ||
    (config.globalInstructionsFile !== null &&
      typeof config.globalInstructionsFile !== 'string')
  ) {
    throw new Error('invalid native config')
  }
  const projectRootMarkers: string[] = []
  for (const marker of config.projectRootMarkers) {
    if (typeof marker !== 'string') {
      throw new Error('invalid native config')
    }
    projectRootMarkers.push(marker)
  }
  return Object.freeze({
    projectRootMarkers: Object.freeze(projectRootMarkers),
    globalInstructionsFile: config.globalInstructionsFile,
  })
}

function cloneEffectiveSkills(
  value: unknown,
): readonly WorkspaceNativeEffectiveSkill[] {
  if (!Array.isArray(value)) {
    throw new Error('invalid native Skill roster')
  }
  const skills: WorkspaceNativeEffectiveSkill[] = []
  for (const candidate of value) {
    if (typeof candidate !== 'object' || candidate === null) {
      throw new Error('invalid native Skill roster')
    }
    const skill = candidate as Record<string, unknown>
    if (
      typeof skill.name !== 'string' ||
      typeof skill.enabled !== 'boolean' ||
      typeof skill.sourceRoot !== 'string'
    ) {
      throw new Error('invalid native Skill roster')
    }
    skills.push(
      Object.freeze({
        name: skill.name,
        enabled: skill.enabled,
        sourceRoot: skill.sourceRoot,
      }),
    )
  }
  return Object.freeze(skills)
}

function deepFreezeLaunch(
  launch: WorkspaceNativeLaunch,
): WorkspaceNativeLaunch {
  Object.freeze(launch.environment)
  Object.freeze(launch.configOverrides)
  return Object.freeze(launch)
}
