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
  OrganizeSourcesActionError,
  createOrganizeSourcesAction,
  renderOrganizeSourcesActionText,
} from './organize-sources-action.js'
import { createWorkspaceFileAccess } from './workspace-file-access.js'
import {
  createWorkspaceSourceProjection,
  type WorkspaceSourceProjection,
} from './workspace-source-projection.js'

test('organize_sources renderer preserves ordered Markdown file references without a trailing newline', () => {
  const text = renderOrganizeSourcesActionText([
    { relativePath: '자료/둘째 강의.pdf' },
    { relativePath: '자료/첫째 ](안내).md' },
  ])

  assert.equal(
    text,
    [
      'ActionInvocation: organize_sources',
      'Selected SemesterWorkspace file references:',
      '- [둘째 강의.pdf](자료/둘째 강의.pdf)',
      '- [첫째 \\]\\(안내).md](자료/첫째 ](안내\\).md)',
    ].join('\n'),
  )
  assert.equal(text.endsWith('\n'), false)
})

test('organize_sources renderer rejects text beyond its UTF-8 bound', () => {
  assert.throws(
    () =>
      renderOrganizeSourcesActionText(
        Array.from({ length: 16 }, (_, index) => ({
          relativePath: `${index}-${'가'.repeat(1_000)}.md`,
        })),
      ),
    (error: unknown) =>
      error instanceof OrganizeSourcesActionError &&
      error.code === 'action_context_invalid',
  )
})

test('organize_sources rejects a user-shaped source projection without shared workspace file access', async () => {
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
    createOrganizeSourcesAction({ sources }),
    (error: unknown) =>
      error instanceof OrganizeSourcesActionError &&
      error.code === 'product_unavailable',
  )
})

test('organize_sources prepare rejects a selected ref that is unsafe at the initial gate', async () => {
  const fixture = await createActionFixture(
    'organize-sources-initial-file-gate-',
  )
  try {
    await rm(fixture.selectedPath)
    await symlink(fixture.outsidePath, fixture.selectedPath)

    await assert.rejects(
      fixture.action.prepare(
        {
          action: 'organize_sources',
          files: [{ relativePath: 'selected.md' }],
        },
        {
          signal: new AbortController().signal,
          listEffectiveSkills: async () => [],
        },
      ),
      (error: unknown) =>
        error instanceof OrganizeSourcesActionError &&
        error.code === 'action_context_stale',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('organize_sources dispatch rejects a selected ref that is unsafe at the final gate', async () => {
  const fixture = await createActionFixture(
    'organize-sources-dispatch-file-race-',
  )
  const input = {
    action: 'organize_sources',
    files: [{ relativePath: 'selected.md' }],
  } as const
  try {
    const prepared = await fixture.action.prepare(input, {
      signal: new AbortController().signal,
      listEffectiveSkills: async () => [
        {
          name: 'ay-ple-first-assignment',
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
            name: 'ay-ple-first-assignment',
            enabled: true,
            sourceRoot: fixture.skillRoot,
          },
        ],
      }),
      (error: unknown) =>
        error instanceof OrganizeSourcesActionError &&
        error.code === 'action_context_stale',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('organize_sources dispatch rejects an unavailable expected Skill at the final gate', async () => {
  const fixture = await createActionFixture(
    'organize-sources-dispatch-skill-race-',
  )
  const input = {
    action: 'organize_sources',
    files: [{ relativePath: 'selected.md' }],
  } as const
  try {
    const prepared = await fixture.action.prepare(input, {
      signal: new AbortController().signal,
      listEffectiveSkills: async () => [
        {
          name: 'ay-ple-first-assignment',
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
        error instanceof OrganizeSourcesActionError &&
        error.code === 'action_unavailable',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('organize_sources prepare leaves validated settings composition to the operation coordinator', async () => {
  const fixture = await createActionFixture(
    'organize-sources-settings-owner-',
  )
  try {
    const prepared = await fixture.action.prepare(
      {
        action: 'organize_sources',
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
            name: 'ay-ple-first-assignment',
            enabled: true,
            sourceRoot: fixture.skillRoot,
          },
        ],
      },
    )

    assert.deepEqual(prepared, {
      permissionProfile: 'workspace_write',
      skill: {
        name: 'ay-ple-first-assignment',
        path: path.join(fixture.skillRoot, 'SKILL.md'),
      },
      text: [
        'ActionInvocation: organize_sources',
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
    ReturnType<typeof createOrganizeSourcesAction>
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
    'ay-ple-first-assignment',
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
  const action = await createOrganizeSourcesAction({
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
