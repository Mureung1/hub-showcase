import type {
  CodexEffectiveSkill,
  CodexProductSkillInput,
} from '@ay-ple/codex-chat-runtime'
import type {
  ProductWorkspaceFileRef,
  TargetProductActionInvocationRequest,
} from '@ay-ple/product-contract'

import type { WorkspaceFilesystemAuthority } from './workspace-filesystem-authority.js'
import {
  WorkspaceSourceProjectionError,
  type WorkspaceSourceProjection,
  workspaceFilesystemAuthorityForSourceProjection,
} from './workspace-source-projection.js'

const actionTextMaxBytes = 32 * 1024
const skillName = 'ay-ple-first-assignment'

export type PreparedOrganizeSourcesAction = {
  readonly permissionProfile: 'workspace_write'
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
  revalidateForDispatch(
    input: TargetProductActionInvocationRequest,
    prepared: PreparedOrganizeSourcesAction,
    context: {
      readonly signal: AbortSignal
    },
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
  let authority: WorkspaceFilesystemAuthority
  let expectedSkillRoot: string
  try {
    authority =
      workspaceFilesystemAuthorityForSourceProjection(options.sources)
    expectedSkillRoot = authority.pathFor([
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

      let skill: CodexProductSkillInput
      try {
        skill = await resolveExpectedSkill(skills, {
          expectedSkillRoot,
          authority,
        })
      } catch (error) {
        await assertCurrentActionWorkspace(authority)
        throw error
      }
      context.signal.throwIfAborted()

      try {
        files = await options.sources.preflightTextFiles(input.files)
      } catch (error) {
        throw mapSourceError(error)
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
      context.signal.throwIfAborted()
      let files: readonly ProductWorkspaceFileRef[]
      try {
        files = await options.sources.preflightTextFiles(input.files)
      } catch (error) {
        throw mapSourceError(error)
      }
      context.signal.throwIfAborted()

      const expectedSkillPath = authority.pathFor([
        '.agents',
        'skills',
        skillName,
        'SKILL.md',
      ])
      try {
        await authority.assertRegularFile([
          '.agents',
          'skills',
          skillName,
          'SKILL.md',
        ])
      } catch (error) {
        await assertCurrentActionWorkspace(authority)
        throw new OrganizeSourcesActionError('action_unavailable')
      }
      context.signal.throwIfAborted()

      if (
        prepared.permissionProfile !== 'workspace_write' ||
        prepared.skill.name !== skillName ||
        prepared.skill.path !== expectedSkillPath ||
        prepared.text !== renderOrganizeSourcesActionText(files)
      ) {
        throw new OrganizeSourcesActionError('action_context_stale')
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
    readonly authority: WorkspaceFilesystemAuthority
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
    const skillPath = options.authority.pathFor(skillSegments)
    await options.authority.assertRegularFile(skillSegments)
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
  authority: WorkspaceFilesystemAuthority,
): Promise<void> {
  try {
    await authority.assertCurrentWorkspace()
  } catch (error) {
    if (error instanceof OrganizeSourcesActionError) throw error
    throw new OrganizeSourcesActionError('action_context_stale')
  }
}
