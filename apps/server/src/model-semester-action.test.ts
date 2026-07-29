import assert from 'node:assert/strict'
import {
  mkdir,
  mkdtemp,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  ModelSemesterActionError,
  createModelSemesterAction,
  renderModelSemesterActionText,
} from './model-semester-action.js'
import { createWorkspaceFileAccess } from './workspace-file-access.js'
import {
  createWorkspaceSourceProjection,
  type WorkspaceSourceProjection,
} from './workspace-source-projection.js'

test('model_semester renderer preserves ordered Codex file references without a trailing newline', () => {
  const text = renderModelSemesterActionText([
    { relativePath: '자료/둘째 강의.pdf' },
    { relativePath: '자료/첫째 ](안내).md' },
  ])

  assert.equal(
    text,
    [
      'ActionInvocation: model_semester',
      'Selected SemesterWorkspace file references:',
      '- [둘째 강의.pdf](자료/둘째 강의.pdf)',
      '- [첫째 \\]\\(안내).md](자료/첫째 ](안내\\).md)',
    ].join('\n'),
  )
  assert.equal(text.endsWith('\n'), false)
})

test('model_semester renderer rejects text beyond its UTF-8 bound', () => {
  assert.throws(
    () =>
      renderModelSemesterActionText(
        Array.from({ length: 16 }, (_, index) => ({
          relativePath: `${index}-${'가'.repeat(1_000)}.md`,
        })),
      ),
    (error: unknown) =>
      error instanceof ModelSemesterActionError &&
      error.code === 'action_context_invalid',
  )
})

test('model_semester rejects a user-shaped source projection without shared workspace file access', async () => {
  const sources = {
    async list() {
      return { sources: [] }
    },
    async preflightFiles(files) {
      return files
    },
    async readText() {
      throw new Error('not used')
    },
    async readPdf() {
      throw new Error('not used')
    },
  } satisfies WorkspaceSourceProjection

  await assert.rejects(
    createModelSemesterAction({ sources }),
    (error: unknown) =>
      error instanceof ModelSemesterActionError &&
      error.code === 'product_unavailable',
  )
})

test('model_semester prepare rejects a selected ref that is unsafe at the initial gate', async () => {
  const fixture = await createActionFixture(
    'model-semester-initial-file-gate-',
  )
  try {
    await rm(fixture.selectedPath)
    await symlink(fixture.outsidePath, fixture.selectedPath)

    await assert.rejects(
      fixture.action.prepare(
        {
          action: 'model_semester',
          files: [{ relativePath: 'selected.md' }],
        },
        {
          signal: new AbortController().signal,
          listEffectiveSkills: async () => [],
        },
      ),
      (error: unknown) =>
        error instanceof ModelSemesterActionError &&
        error.code === 'action_context_stale',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('model_semester dispatch rejects a selected ref that is unsafe at the final gate', async () => {
  const fixture = await createActionFixture(
    'model-semester-dispatch-file-race-',
  )
  const input = {
    action: 'model_semester',
    files: [{ relativePath: 'selected.md' }],
  } as const
  try {
    const prepared = await fixture.action.prepare(input, {
      signal: new AbortController().signal,
      listEffectiveSkills: async () => [
        {
          name: 'ay-ple-semester-modeling',
          enabled: true,
          sourceRoot: fixture.skillRoot,
        },
      ],
    })

    await rm(fixture.selectedPath)
    await symlink(fixture.outsidePath, fixture.selectedPath)

    await assert.rejects(
      fixture.action.revalidateForDispatch(input, prepared, {
        signal: new AbortController().signal,
        listEffectiveSkills: async () => [
          {
            name: 'ay-ple-semester-modeling',
            enabled: true,
            sourceRoot: fixture.skillRoot,
          },
        ],
      }),
      (error: unknown) =>
        error instanceof ModelSemesterActionError &&
        error.code === 'action_context_stale',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('model_semester dispatch rejects an unavailable expected Skill at the final gate', async () => {
  const fixture = await createActionFixture(
    'model-semester-dispatch-skill-race-',
  )
  const input = {
    action: 'model_semester',
    files: [{ relativePath: 'selected.md' }],
  } as const
  try {
    const prepared = await fixture.action.prepare(input, {
      signal: new AbortController().signal,
      listEffectiveSkills: async () => [
        {
          name: 'ay-ple-semester-modeling',
          enabled: true,
          sourceRoot: fixture.skillRoot,
        },
      ],
    })

    await assert.rejects(
      fixture.action.revalidateForDispatch(input, prepared, {
        signal: new AbortController().signal,
        listEffectiveSkills: async () => [],
      }),
      (error: unknown) =>
        error instanceof ModelSemesterActionError &&
        error.code === 'action_unavailable',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('model_semester prepare leaves validated settings composition to the operation coordinator', async () => {
  const fixture = await createActionFixture(
    'model-semester-settings-owner-',
  )
  try {
    const prepared = await fixture.action.prepare(
      {
        action: 'model_semester',
        files: [{ relativePath: 'selected.md' }],
        codexSettings: {
          model: 'gpt-current',
          reasoningEffort: 'medium',
          serviceTier: 'default',
        },
      },
      {
        signal: new AbortController().signal,
        listEffectiveSkills: async () => [
          {
            name: 'ay-ple-semester-modeling',
            enabled: true,
            sourceRoot: fixture.skillRoot,
          },
        ],
      },
    )

    assert.deepEqual(prepared, {
      permissionProfile: 'workspace_write',
      skill: {
        name: 'ay-ple-semester-modeling',
        path: path.join(fixture.skillRoot, 'SKILL.md'),
      },
      text: [
        'ActionInvocation: model_semester',
        'Selected SemesterWorkspace file references:',
        '- [selected.md](selected.md)',
      ].join('\n'),
    })
  } finally {
    await fixture.cleanup()
  }
})

async function createActionFixture(prefix: string): Promise<{
  readonly action: Awaited<
    ReturnType<typeof createModelSemesterAction>
  >
  readonly outsidePath: string
  readonly selectedPath: string
  readonly skillRoot: string
  cleanup(): Promise<void>
}> {
  const parent = await realpath(
    await mkdtemp(path.join(tmpdir(), prefix)),
  )
  const workspaceRoot = path.join(parent, 'workspace')
  const outsideRoot = path.join(parent, 'outside')
  const skillRoot = path.join(
    workspaceRoot,
    '.agents',
    'skills',
    'ay-ple-semester-modeling',
  )
  await Promise.all([
    mkdir(skillRoot, { recursive: true }),
    mkdir(outsideRoot, { recursive: true }),
  ])
  const selectedPath = path.join(workspaceRoot, 'selected.md')
  const outsidePath = path.join(outsideRoot, 'outside.md')
  await Promise.all([
    writeFile(selectedPath, 'selected'),
    writeFile(outsidePath, 'outside'),
    writeFile(path.join(skillRoot, 'SKILL.md'), '# Skill'),
  ])
  const fileAccess =
    await createWorkspaceFileAccess(workspaceRoot)
  const sources = await createWorkspaceSourceProjection({ fileAccess })
  const action = await createModelSemesterAction({
    sources,
  })
  return {
    action,
    outsidePath,
    selectedPath,
    skillRoot,
    cleanup: () => rm(parent, { force: true, recursive: true }),
  }
}
