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
const skillName = 'ay-ple-semester-modeling'

export type PreparedModelSemesterAction = {
  readonly permissionProfile: 'workspace_write'
  readonly skill: CodexProductSkillInput
  readonly text: string
}

type ModelSemesterActionContext = {
  readonly signal: AbortSignal
  readonly listEffectiveSkills: (
    signal: AbortSignal,
  ) => Promise<readonly CodexEffectiveSkill[]>
}

export type ModelSemesterAction = {
  prepare(
    input: TargetProductActionInvocationRequest,
    context: ModelSemesterActionContext,
  ): Promise<PreparedModelSemesterAction>
  revalidateForDispatch(
    input: TargetProductActionInvocationRequest,
    prepared: PreparedModelSemesterAction,
    context: ModelSemesterActionContext,
  ): Promise<void>
}

export class ModelSemesterActionError extends Error {
  constructor(
    readonly code:
      | 'action_context_stale'
      | 'action_context_invalid'
      | 'action_unavailable'
      | 'product_unavailable',
  ) {
    super(code)
    this.name = 'ModelSemesterActionError'
  }
}

export async function createModelSemesterAction(options: {
  readonly sources: WorkspaceSourceProjection
}): Promise<ModelSemesterAction> {
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
    throw new ModelSemesterActionError('product_unavailable')
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
        throw new ModelSemesterActionError('product_unavailable')
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

      const text = renderModelSemesterActionText(files)
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
        throw new ModelSemesterActionError('product_unavailable')
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
        prepared.text !== renderModelSemesterActionText(files)
      ) {
        throw new ModelSemesterActionError('action_context_stale')
      }
    },
  }
}

function assertDispatchActive(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new ModelSemesterActionError('product_unavailable')
  }
}

export function renderModelSemesterActionText(
  files: readonly ProductWorkspaceFileRef[],
): string {
  const text = [
    'ActionInvocation: model_semester',
    'Selected SemesterWorkspace file references:',
    ...files.map(
      ({ relativePath }) =>
        `- ${renderCodexFileReference(relativePath)}`,
    ),
  ].join('\n')
  if (Buffer.byteLength(text) > actionTextMaxBytes) {
    throw new ModelSemesterActionError('action_context_invalid')
  }
  return text
}

// Keep filesystem paths lossless using the same delimiter escaping as the
// Codex Desktop composer instead of URI-encoding them.
function renderCodexFileReference(relativePath: string): string {
  const label = path.posix.basename(relativePath)
  return (
    `[${escapeCodexFileReferenceLabel(label)}]` +
    `(${escapeCodexFileReferencePath(relativePath)})`
  )
}

function escapeCodexFileReferenceLabel(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('](', ']\\(')
    .replaceAll(']', '\\]')
}

function escapeCodexFileReferencePath(value: string): string {
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
    throw new ModelSemesterActionError('action_unavailable')
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
    if (error instanceof ModelSemesterActionError) throw error
    throw new ModelSemesterActionError('action_unavailable')
  }
}

function mapSourceError(error: unknown): ModelSemesterActionError {
  if (!(error instanceof WorkspaceSourceProjectionError)) {
    return new ModelSemesterActionError('product_unavailable')
  }
  switch (error.code) {
    case 'unsupported_type':
    case 'unsupported_encoding':
    case 'invalid_pdf':
    case 'source_too_large':
      return new ModelSemesterActionError('action_context_invalid')
    case 'invalid_path':
    case 'source_not_found':
    case 'source_unavailable':
    case 'scan_limit_exceeded':
      return new ModelSemesterActionError('action_context_stale')
  }
}

async function assertCurrentActionWorkspace(
  fileAccess: WorkspaceFileAccess,
): Promise<void> {
  try {
    await fileAccess.assertPinnedWorkspaceCurrent()
  } catch (error) {
    if (error instanceof ModelSemesterActionError) throw error
    throw new ModelSemesterActionError('action_context_stale')
  }
}
