import path from 'node:path'

import type {
  CodexEffectiveSkill,
  CodexProductSkillInput,
} from '@ay-ple/codex-chat-runtime'
import type {
  ProductWorkspaceFileRef,
  TargetProductActionInvocationRequest,
} from '@ay-ple/product-contract'

import type { WorkspaceFileAccess } from './workspace-file-access.js'
import {
  WorkspaceSourceProjectionError,
  type WorkspaceSourceProjection,
  workspaceFileAccessForSourceProjection,
} from './workspace-source-projection.js'

const actionTextMaxBytes = 32 * 1024
const skillName = 'ay-ple-first-assignment'

export type PreparedOrganizeSourcesAction = {
  readonly permissionProfile: 'workspace_write'
  readonly skill: CodexProductSkillInput
  readonly text: string
}

type OrganizeSourcesActionContext = {
  readonly signal: AbortSignal
  readonly listEffectiveSkills: (
    signal: AbortSignal,
  ) => Promise<readonly CodexEffectiveSkill[]>
}

export type OrganizeSourcesAction = {
  prepare(
    input: TargetProductActionInvocationRequest,
    context: OrganizeSourcesActionContext,
  ): Promise<PreparedOrganizeSourcesAction>
  revalidateForDispatch(
    input: TargetProductActionInvocationRequest,
    prepared: PreparedOrganizeSourcesAction,
    context: OrganizeSourcesActionContext,
  ): Promise<void>
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
  readonly sources: WorkspaceSourceProjection
}): Promise<OrganizeSourcesAction> {
  let fileAccess: WorkspaceFileAccess
  let expectedSkillRoot: string
  try {
    fileAccess =
      workspaceFileAccessForSourceProjection(options.sources)
    expectedSkillRoot = fileAccess.pathFor([
      '.agents',
      'skills',
      skillName,
    ])
  } catch {
    throw new OrganizeSourcesActionError('product_unavailable')
  }

  return {
    async prepare(input, context) {
      context.signal.throwIfAborted()
      let files: readonly ProductWorkspaceFileRef[]
      try {
        files = await options.sources.preflightFiles(input.files)
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

      let skill: CodexProductSkillInput
      try {
        skill = await resolveExpectedSkill(skills, {
          expectedSkillRoot,
          fileAccess,
        })
      } catch (error) {
        await assertCurrentActionWorkspace(fileAccess)
        throw error
      }
      context.signal.throwIfAborted()

      const text = renderOrganizeSourcesActionText(files)
      return {
        permissionProfile: 'workspace_write',
        skill,
        text,
      }
    },

    async revalidateForDispatch(input, prepared, context) {
      assertDispatchActive(context.signal)
      let skills: readonly CodexEffectiveSkill[]
      try {
        skills = await context.listEffectiveSkills(context.signal)
      } catch {
        throw new OrganizeSourcesActionError('product_unavailable')
      }
      assertDispatchActive(context.signal)

      let skill: CodexProductSkillInput
      try {
        skill = await resolveExpectedSkill(skills, {
          expectedSkillRoot,
          fileAccess,
        })
      } catch (error) {
        await assertCurrentActionWorkspace(fileAccess)
        throw error
      }
      assertDispatchActive(context.signal)

      let files: readonly ProductWorkspaceFileRef[]
      try {
        files = await options.sources.preflightFiles(input.files)
      } catch (error) {
        throw mapSourceError(error)
      }
      assertDispatchActive(context.signal)

      if (
        prepared.permissionProfile !== 'workspace_write' ||
        prepared.skill.name !== skill.name ||
        prepared.skill.path !== skill.path ||
        prepared.text !== renderOrganizeSourcesActionText(files)
      ) {
        throw new OrganizeSourcesActionError('action_context_stale')
      }
    },
  }
}

function assertDispatchActive(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new OrganizeSourcesActionError('product_unavailable')
  }
}

export function renderOrganizeSourcesActionText(
  files: readonly ProductWorkspaceFileRef[],
): string {
  const text = [
    'ActionInvocation: organize_sources',
    'Selected SemesterWorkspace file references:',
    ...files.map(
      ({ relativePath }) =>
        `- ${renderMarkdownFileReference(relativePath)}`,
    ),
  ].join('\n')
  if (Buffer.byteLength(text) > actionTextMaxBytes) {
    throw new OrganizeSourcesActionError('action_context_invalid')
  }
  return text
}

function renderMarkdownFileReference(relativePath: string): string {
  const label = path.posix.basename(relativePath)
  return (
    `[${escapeMarkdownLinkLabel(label)}]` +
    `(${escapeMarkdownLinkDestination(relativePath)})`
  )
}

function escapeMarkdownLinkLabel(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('](', ']\\(')
    .replaceAll(']', '\\]')
}

function escapeMarkdownLinkDestination(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll(')', '\\)')
}

async function resolveExpectedSkill(
  skills: readonly CodexEffectiveSkill[],
  options: {
    readonly expectedSkillRoot: string
    readonly fileAccess: WorkspaceFileAccess
  },
): Promise<CodexProductSkillInput> {
  const matches = skills.filter(
    (skill) =>
      skill.name === skillName &&
      skill.enabled === true &&
      skill.sourceRoot === options.expectedSkillRoot,
  )
  if (matches.length !== 1) {
    throw new OrganizeSourcesActionError('action_unavailable')
  }

  try {
    const skillSegments = [
      '.agents',
      'skills',
      skillName,
      'SKILL.md',
    ] as const
    const skillPath = options.fileAccess.pathFor(skillSegments)
    await options.fileAccess.assertRegularFile(skillSegments)
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

async function assertCurrentActionWorkspace(
  fileAccess: WorkspaceFileAccess,
): Promise<void> {
  try {
    await fileAccess.assertPinnedWorkspaceCurrent()
  } catch (error) {
    if (error instanceof OrganizeSourcesActionError) throw error
    throw new OrganizeSourcesActionError('action_context_stale')
  }
}
