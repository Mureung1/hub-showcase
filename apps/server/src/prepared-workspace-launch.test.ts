import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

import {
  createInitialSemesterWorkspaceStateV4,
  encodeSemesterWorkspaceStateV4,
} from '@ay-ple/semester-workspace'

import { resolvePreparedWorkspaceLaunch } from './prepared-workspace-launch.js'
import {
  createWorkspaceRegistryStore,
  encodeWorkspaceRegistry,
} from './workspace-registry.js'

const execFileAsync = promisify(execFile)
const firstWorkspaceId =
  'workspace_0123456789abcdef0123456789abcdef'
const secondWorkspaceId =
  'workspace_fedcba9876543210fedcba9876543210'

test('an explicit prepared root wins over the active registry and may be dirty', async () => {
  const fixture = await createFixture()
  try {
    const store = createWorkspaceRegistryStore({
      appDataRoot: fixture.appDataRoot,
    })
    const committed = await store.commitActiveWorkspace({
      expectedAuthority: null,
      canonicalRoot: fixture.registeredRoot,
      expectedWorkspaceId: firstWorkspaceId,
    })
    assert.equal(committed.status, 'written')
    await writeFile(
      path.join(fixture.explicitRoot, 'dirty-notes.md'),
      'keep this uncommitted\n',
      'utf8',
    )

    const result = await resolvePreparedWorkspaceLaunch({
      appDataRoot: fixture.appDataRoot,
      explicitWorkspaceRoot: fixture.explicitRoot,
    })

    assert.deepEqual(result, {
      status: 'selected',
      source: 'explicit',
      canonicalRoot: fixture.explicitRoot,
      workspace: createInitialSemesterWorkspaceStateV4({
        workspaceId: secondWorkspaceId,
        semester: semester('spring', '1학기'),
      }),
    })
  } finally {
    await rm(fixture.root, { force: true, recursive: true })
  }
})

test('startup without an explicit root freshly reopens the active registry root', async () => {
  const fixture = await createFixture()
  try {
    const store = createWorkspaceRegistryStore({
      appDataRoot: fixture.appDataRoot,
    })
    const committed = await store.commitActiveWorkspace({
      expectedAuthority: null,
      canonicalRoot: fixture.registeredRoot,
      expectedWorkspaceId: firstWorkspaceId,
    })
    assert.equal(committed.status, 'written')

    assert.deepEqual(
      await resolvePreparedWorkspaceLaunch({
        appDataRoot: fixture.appDataRoot,
      }),
      {
        status: 'selected',
        source: 'registry',
        canonicalRoot: fixture.registeredRoot,
        workspace: createInitialSemesterWorkspaceStateV4({
          workspaceId: firstWorkspaceId,
          semester: semester('fall', '2학기'),
        }),
      },
    )
  } finally {
    await rm(fixture.root, { force: true, recursive: true })
  }
})

test('no explicit or registered root fails without creating app data', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'prepared-launch-test-'))
  const appDataRoot = path.join(root, 'missing-app-data')
  try {
    assert.deepEqual(
      await resolvePreparedWorkspaceLaunch({ appDataRoot }),
      {
        status: 'failure',
        code: 'prepared_workspace_required',
      },
    )
    await assert.rejects(lstat(appDataRoot), { code: 'ENOENT' })
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('invalid explicit roots fail before reading or changing the registry', async () => {
  const fixture = await createFixture()
  const nestedRoot = path.join(fixture.explicitRoot, 'nested')
  const symlinkRoot = path.join(fixture.root, 'workspace-link')
  const registryDirectory = path.join(fixture.appDataRoot, 'state')
  const registryPath = path.join(
    registryDirectory,
    'workspace-registry.json',
  )
  const registryBytes = Buffer.from(
    '{"kind":"ay-ple.workspace-registry","formatVersion":99}\n',
    'utf8',
  )
  try {
    await mkdir(nestedRoot)
    await writeFile(
      path.join(nestedRoot, 'workspace-state.json'),
      encodeSemesterWorkspaceStateV4(
        createInitialSemesterWorkspaceStateV4({
          workspaceId: secondWorkspaceId,
          semester: semester('spring', '1학기'),
        }),
      ),
    )
    await symlink(fixture.explicitRoot, symlinkRoot)
    await mkdir(registryDirectory)
    await writeFile(registryPath, registryBytes)

    for (const [explicitWorkspaceRoot, reason] of [
      [nestedRoot, 'git_root_mismatch'],
      [symlinkRoot, 'root_unavailable'],
      [path.join(fixture.root, 'missing'), 'root_unavailable'],
    ] as const) {
      assert.deepEqual(
        await resolvePreparedWorkspaceLaunch({
          appDataRoot: fixture.appDataRoot,
          explicitWorkspaceRoot,
        }),
        {
          status: 'failure',
          code: 'prepared_workspace_invalid',
          reason,
        },
      )
    }
    assert.deepEqual(await readFile(registryPath), registryBytes)
  } finally {
    await rm(fixture.root, { force: true, recursive: true })
  }
})

test('Git metadata indirection is not a prepared workspace root', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'prepared-launch-test-'))
  const appDataRoot = path.join(root, 'app-data')
  const sourceRoot = path.join(root, 'worktree-source')
  const linkedRoot = path.join(root, 'linked-worktree')
  const separateRoot = path.join(root, 'separate-worktree')
  const separateGitDirectory = path.join(root, 'separate-git-directory')
  const symlinkedGitRoot = path.join(root, 'symlinked-git-root')
  const symlinkedGitDirectory = path.join(root, 'symlinked-git-directory')
  try {
    await Promise.all([
      mkdir(appDataRoot),
      mkdir(sourceRoot),
      mkdir(separateRoot),
    ])
    await execFileAsync('git', ['init', '--quiet', sourceRoot])
    await execFileAsync(
      'git',
      [
        '-C',
        sourceRoot,
        '-c',
        'user.name=Fixture Author',
        '-c',
        'user.email=fixture@example.com',
        'commit',
        '--quiet',
        '--allow-empty',
        '-m',
        'initial fixture',
      ],
    )
    await execFileAsync(
      'git',
      ['-C', sourceRoot, 'worktree', 'add', '--quiet', linkedRoot],
    )
    await execFileAsync(
      'git',
      [
        'init',
        '--quiet',
        '--separate-git-dir',
        separateGitDirectory,
        separateRoot,
      ],
    )
    await prepareWorkspace(
      symlinkedGitRoot,
      firstWorkspaceId,
      semester('fall', '2학기'),
    )
    await rename(
      path.join(symlinkedGitRoot, '.git'),
      symlinkedGitDirectory,
    )
    await symlink(
      symlinkedGitDirectory,
      path.join(symlinkedGitRoot, '.git'),
    )

    for (const [workspaceRoot, workspaceId] of [
      [linkedRoot, firstWorkspaceId],
      [separateRoot, secondWorkspaceId],
    ] as const) {
      await writeFile(
        path.join(workspaceRoot, 'workspace-state.json'),
        encodeSemesterWorkspaceStateV4(
          createInitialSemesterWorkspaceStateV4({
            workspaceId,
            semester: semester('fall', '2학기'),
          }),
        ),
      )
    }

    for (const explicitWorkspaceRoot of [
      linkedRoot,
      separateRoot,
      symlinkedGitRoot,
    ]) {
      assert.deepEqual(
        await resolvePreparedWorkspaceLaunch({
          appDataRoot,
          explicitWorkspaceRoot: await realpath(explicitWorkspaceRoot),
        }),
        {
          status: 'failure',
          code: 'prepared_workspace_invalid',
          reason: 'git_root_mismatch',
        },
      )
    }
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('legacy, malformed, and future workspace bytes fail without mutation', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'prepared-launch-test-'))
  const appDataRoot = path.join(root, 'app-data')
  try {
    await mkdir(appDataRoot)
    for (const [index, bytes] of [
      Buffer.from('{"formatVersion":2,"preserve":"current-v2"}\n', 'utf8'),
      Buffer.from(
        '{"kind":"ay-ple.semester-workspace","formatVersion":3,"preserve":"historical-v3"}\n',
        'utf8',
      ),
      Buffer.from('{"formatVersion":4,', 'utf8'),
      Buffer.from(
        '{"kind":"ay-ple.semester-workspace","formatVersion":5,"preserve":"future"}\n',
        'utf8',
      ),
    ].entries()) {
      const workspaceRoot = path.join(root, `unsupported-${index}`)
      const statePath = path.join(workspaceRoot, 'workspace-state.json')
      await mkdir(workspaceRoot)
      await execFileAsync('git', ['init', '--quiet', workspaceRoot])
      await writeFile(statePath, bytes)
      const canonicalWorkspaceRoot = await realpath(workspaceRoot)

      assert.deepEqual(
        await resolvePreparedWorkspaceLaunch({
          appDataRoot,
          explicitWorkspaceRoot: canonicalWorkspaceRoot,
        }),
        {
          status: 'failure',
          code: 'prepared_workspace_invalid',
          reason: 'identity_incompatible',
        },
      )
      assert.deepEqual(await readFile(statePath), bytes)
    }
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('malformed and future registry bytes are preserved as exact startup failures', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'prepared-launch-test-'))
  const configuredAppDataRoot = path.join(root, 'app-data')
  const registryDirectory = path.join(configuredAppDataRoot, 'state')
  const registryPath = path.join(
    registryDirectory,
    'workspace-registry.json',
  )
  try {
    await mkdir(registryDirectory, { recursive: true })
    const appDataRoot = await realpath(configuredAppDataRoot)
    for (const [bytes, reason] of [
      [Buffer.from('{broken\n', 'utf8'), 'malformed'],
      [
        Buffer.from(
          '{"kind":"ay-ple.workspace-registry","formatVersion":99,"activeWorkspaceId":null,"workspaces":[]}\n',
          'utf8',
        ),
        'unsupported',
      ],
    ] as const) {
      await writeFile(registryPath, bytes)
      assert.deepEqual(
        await resolvePreparedWorkspaceLaunch({ appDataRoot }),
        {
          status: 'failure',
          code: 'registry_incompatible',
          reason,
        },
      )
      assert.deepEqual(await readFile(registryPath), bytes)
    }
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('moved and identity-reused registered roots fail closed', async () => {
  const fixture = await createFixture()
  const registryDirectory = path.join(fixture.appDataRoot, 'state')
  const registryPath = path.join(
    registryDirectory,
    'workspace-registry.json',
  )
  const registeredBytes = encodeWorkspaceRegistry({
    kind: 'ay-ple.workspace-registry',
    formatVersion: 1,
    activeWorkspaceId: firstWorkspaceId,
    workspaces: [
      {
        workspaceId: firstWorkspaceId,
        canonicalRoot: fixture.registeredRoot,
      },
    ],
  })
  try {
    await mkdir(registryDirectory)
    await writeFile(registryPath, registeredBytes)
    await writeFile(
      path.join(fixture.registeredRoot, 'workspace-state.json'),
      encodeSemesterWorkspaceStateV4(
        createInitialSemesterWorkspaceStateV4({
          workspaceId: secondWorkspaceId,
          semester: semester('spring', '1학기'),
        }),
      ),
    )
    assert.deepEqual(
      await resolvePreparedWorkspaceLaunch({
        appDataRoot: fixture.appDataRoot,
      }),
      {
        status: 'failure',
        code: 'registered_workspace_unavailable',
        workspaceId: firstWorkspaceId,
        reason: 'identity_mismatch',
      },
    )
    assert.deepEqual(await readFile(registryPath), registeredBytes)

    const movedRoot = path.join(fixture.root, 'moved-registered')
    await rename(fixture.registeredRoot, movedRoot)
    assert.deepEqual(
      await resolvePreparedWorkspaceLaunch({
        appDataRoot: fixture.appDataRoot,
      }),
      {
        status: 'failure',
        code: 'registered_workspace_unavailable',
        workspaceId: firstWorkspaceId,
        reason: 'root_unavailable',
      },
    )
    assert.deepEqual(await readFile(registryPath), registeredBytes)
  } finally {
    await rm(fixture.root, { force: true, recursive: true })
  }
})

async function createFixture(): Promise<{
  readonly root: string
  readonly appDataRoot: string
  readonly registeredRoot: string
  readonly explicitRoot: string
}> {
  const root = await mkdtemp(path.join(tmpdir(), 'prepared-launch-test-'))
  const appDataRoot = path.join(root, 'app-data')
  const registeredRoot = path.join(root, 'registered')
  const explicitRoot = path.join(root, 'explicit')
  await Promise.all([
    mkdir(appDataRoot),
    prepareWorkspace(
      registeredRoot,
      firstWorkspaceId,
      semester('fall', '2학기'),
    ),
    prepareWorkspace(
      explicitRoot,
      secondWorkspaceId,
      semester('spring', '1학기'),
    ),
  ])
  return {
    root: await realpath(root),
    appDataRoot: await realpath(appDataRoot),
    registeredRoot: await realpath(registeredRoot),
    explicitRoot: await realpath(explicitRoot),
  }
}

async function prepareWorkspace(
  root: string,
  workspaceId: string,
  value: ReturnType<typeof semester>,
): Promise<void> {
  await mkdir(root)
  await execFileAsync('git', ['init', '--quiet', root])
  await writeFile(
    path.join(root, 'workspace-state.json'),
    encodeSemesterWorkspaceStateV4(
      createInitialSemesterWorkspaceStateV4({
        workspaceId,
        semester: value,
      }),
    ),
  )
}

function semester(key: string, displayName: string) {
  return {
    yearLevel: 2,
    term: { key, displayName },
  }
}
