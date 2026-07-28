import { lstat, realpath } from 'node:fs/promises'
import path from 'node:path'

import type {
  CodexEffectiveSkill,
  CodexProductSkillInput,
} from '@ay-ple/codex-chat-runtime'
import type {
  ProductCodexTurnSettings,
  ProductWorkspaceFileRef,
  TargetProductActionInvocationRequest,
} from '@ay-ple/product-contract'

import {
  WorkspaceSourceProjectionError,
  type WorkspaceSourceProjection,
} from './workspace-source-projection.js'

const actionTextMaxBytes = 32 * 1024
const skillName = 'ay-ple-first-assignment'

type WorkspaceRootIdentity = {
  readonly device: number
  readonly inode: number
}

export type PreparedOrganizeSourcesAction = {
  readonly permissionProfile: 'workspace_write'
  readonly settings?: ProductCodexTurnSettings
  readonly skill: CodexProductSkillInput
  readonly text: string
}

export type OrganizeSourcesAction = {
  prepare(
    input: TargetProductActionInvocationRequest,
    context: {
      readonly signal: AbortSignal
      readonly listEffectiveSkills: (
        signal: AbortSignal,
      ) => Promise<readonly CodexEffectiveSkill[]>
    },
  ): Promise<PreparedOrganizeSourcesAction>
}

export class OrganizeSourcesActionError extends Error {
  constructor(
    readonly code:
      | 'action_context_stale'
      | 'action_context_invalid'
      | 'action_unavailable'
      | 'product_unavailable',
  ) {
    super(code)
    this.name = 'OrganizeSourcesActionError'
  }
}

export async function createOrganizeSourcesAction(options: {
  readonly workspaceRoot: string
  readonly sources: WorkspaceSourceProjection
}): Promise<OrganizeSourcesAction> {
  const workspaceRoot = await requireCanonicalDirectory(options.workspaceRoot)
  const workspaceRootIdentity = await readDirectoryIdentity(workspaceRoot)
  const expectedSkillRoot = path.join(
    workspaceRoot,
    '.agents',
    'skills',
    skillName,
  )

  return {
    async prepare(input, context) {
      context.signal.throwIfAborted()
      let files: readonly ProductWorkspaceFileRef[]
      try {
        files = await options.sources.preflightTextFiles(input.files)
      } catch (error) {
        throw mapSourceError(error)
      }
      context.signal.throwIfAborted()

      let skills: readonly CodexEffectiveSkill[]
      try {
        skills = await context.listEffectiveSkills(context.signal)
      } catch {
        throw new OrganizeSourcesActionError('product_unavailable')
      }
      context.signal.throwIfAborted()

      await assertWorkspaceRootIdentity(
        workspaceRoot,
        workspaceRootIdentity,
      )
      const skill = await resolveExpectedSkill(skills, {
        expectedSkillRoot,
        workspaceRoot,
      })
      await assertWorkspaceRootIdentity(
        workspaceRoot,
        workspaceRootIdentity,
      )
      const text = renderOrganizeSourcesActionText(files)
      return {
        permissionProfile: 'workspace_write',
        ...(input.codexSettings === undefined
          ? {}
          : { settings: input.codexSettings }),
        skill,
        text,
      }
    },
  }
}

export function renderOrganizeSourcesActionText(
  files: readonly ProductWorkspaceFileRef[],
): string {
  const text = [
    'ActionInvocation: organize_sources',
    'Selected SemesterWorkspace file references:',
    ...files.map(({ relativePath }) => `- ${JSON.stringify(relativePath)}`),
  ].join('\n')
  if (Buffer.byteLength(text) > actionTextMaxBytes) {
    throw new OrganizeSourcesActionError('action_context_invalid')
  }
  return text
}

async function resolveExpectedSkill(
  skills: readonly CodexEffectiveSkill[],
  options: {
    readonly expectedSkillRoot: string
    readonly workspaceRoot: string
  },
): Promise<CodexProductSkillInput> {
  const matches = skills.filter(
    (skill) =>
      skill.name === skillName &&
      skill.enabled === true &&
      path.isAbsolute(skill.sourceRoot) &&
      path.normalize(skill.sourceRoot) === skill.sourceRoot &&
      skill.sourceRoot === options.expectedSkillRoot,
  )
  if (matches.length !== 1) {
    throw new OrganizeSourcesActionError('action_unavailable')
  }

  try {
    const rootStats = await lstat(options.expectedSkillRoot)
    const canonicalRoot = await realpath(options.expectedSkillRoot)
    if (
      rootStats.isSymbolicLink() ||
      !rootStats.isDirectory() ||
      canonicalRoot !== options.expectedSkillRoot ||
      !isPathWithinRoot(canonicalRoot, options.workspaceRoot)
    ) {
      throw new OrganizeSourcesActionError('action_unavailable')
    }
    const skillPath = path.join(options.expectedSkillRoot, 'SKILL.md')
    const skillStats = await lstat(skillPath)
    const canonicalSkillPath = await realpath(skillPath)
    if (
      skillStats.isSymbolicLink() ||
      !skillStats.isFile() ||
      canonicalSkillPath !== skillPath ||
      !isPathWithinRoot(canonicalSkillPath, options.workspaceRoot)
    ) {
      throw new OrganizeSourcesActionError('action_unavailable')
    }
    return { name: skillName, path: skillPath }
  } catch (error) {
    if (error instanceof OrganizeSourcesActionError) throw error
    throw new OrganizeSourcesActionError('action_unavailable')
  }
}

function mapSourceError(error: unknown): OrganizeSourcesActionError {
  if (!(error instanceof WorkspaceSourceProjectionError)) {
    return new OrganizeSourcesActionError('product_unavailable')
  }
  switch (error.code) {
    case 'unsupported_type':
    case 'unsupported_encoding':
    case 'invalid_pdf':
    case 'source_too_large':
      return new OrganizeSourcesActionError('action_context_invalid')
    case 'invalid_path':
    case 'source_not_found':
    case 'source_unavailable':
    case 'scan_limit_exceeded':
      return new OrganizeSourcesActionError('action_context_stale')
  }
}

async function requireCanonicalDirectory(directory: string): Promise<string> {
  const [canonical, stats] = await Promise.all([
    realpath(directory),
    lstat(directory),
  ])
  if (
    canonical !== directory ||
    stats.isSymbolicLink() ||
    !stats.isDirectory()
  ) {
    throw new OrganizeSourcesActionError('product_unavailable')
  }
  return canonical
}

async function readDirectoryIdentity(
  directory: string,
): Promise<WorkspaceRootIdentity> {
  const stats = await lstat(directory)
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new OrganizeSourcesActionError('product_unavailable')
  }
  return { device: stats.dev, inode: stats.ino }
}

async function assertWorkspaceRootIdentity(
  workspaceRoot: string,
  expected: WorkspaceRootIdentity,
): Promise<void> {
  try {
    const [canonical, current] = await Promise.all([
      realpath(workspaceRoot),
      readDirectoryIdentity(workspaceRoot),
    ])
    if (
      canonical !== workspaceRoot ||
      current.device !== expected.device ||
      current.inode !== expected.inode
    ) {
      throw new OrganizeSourcesActionError('action_context_stale')
    }
  } catch (error) {
    if (error instanceof OrganizeSourcesActionError) throw error
    throw new OrganizeSourcesActionError('action_context_stale')
  }
}

function isPathWithinRoot(candidate: string, workspaceRoot: string): boolean {
  return (
    candidate !== workspaceRoot &&
    candidate.startsWith(`${workspaceRoot}${path.sep}`)
  )
}
