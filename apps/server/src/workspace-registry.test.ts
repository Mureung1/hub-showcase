import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  createInitialSemesterWorkspaceStateV4,
  encodeSemesterWorkspaceStateV4,
} from '@ay-ple/semester-workspace'

import {
  WorkspaceRegistryCodecError,
  createWorkspaceRegistryStore,
  decodeWorkspaceRegistryBytes,
  encodeWorkspaceRegistry,
} from './workspace-registry.js'

const firstWorkspaceId =
  'workspace_0123456789abcdef0123456789abcdef'
const secondWorkspaceId =
  'workspace_fedcba9876543210fedcba9876543210'

test('the registry codec enforces its exact envelope, uniqueness, active membership, entry bound, and absolute normalized roots', () => {
  const valid = {
    kind: 'ay-ple.workspace-registry' as const,
    formatVersion: 1 as const,
    activeWorkspaceId: firstWorkspaceId,
    workspaces: [
      {
        workspaceId: firstWorkspaceId,
        canonicalRoot: '/Users/student/semester-one',
      },
      {
        workspaceId: secondWorkspaceId,
        canonicalRoot: '/Users/student/semester-two',
      },
    ],
  }

  assert.deepEqual(
    decodeWorkspaceRegistryBytes(encodeWorkspaceRegistry(valid)),
    valid,
  )

  const invalid = [
    { ...valid, extra: true },
    { ...valid, formatVersion: 2 },
    { ...valid, activeWorkspaceId: 'workspace_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    {
      ...valid,
      workspaces: [...valid.workspaces, valid.workspaces[0]],
    },
    {
      ...valid,
      workspaces: [
        valid.workspaces[0],
        { ...valid.workspaces[1], workspaceId: firstWorkspaceId },
      ],
    },
    {
      ...valid,
      workspaces: [
        valid.workspaces[0],
        {
          ...valid.workspaces[1],
          canonicalRoot: valid.workspaces[0].canonicalRoot,
        },
      ],
    },
    {
      ...valid,
      workspaces: [
        {
          ...valid.workspaces[0],
          canonicalRoot: 'relative/semester',
        },
      ],
    },
    {
      ...valid,
      workspaces: [
        {
          ...valid.workspaces[0],
          canonicalRoot: '/Users/student/../student/semester-one',
        },
      ],
    },
    {
      ...valid,
      workspaces: Array.from({ length: 65 }, (_, index) => ({
        workspaceId: `workspace_${index.toString(16).padStart(32, '0')}`,
        canonicalRoot: `/Users/student/semester-${index}`,
      })),
    },
  ]

  for (const candidate of invalid) {
    assert.throws(
      () =>
        decodeWorkspaceRegistryBytes(
          Buffer.from(JSON.stringify(candidate), 'utf8'),
        ),
      WorkspaceRegistryCodecError,
    )
  }
  assert.throws(
    () => decodeWorkspaceRegistryBytes(Buffer.alloc(256 * 1024 + 1)),
    WorkspaceRegistryCodecError,
  )
  assert.throws(
    () => decodeWorkspaceRegistryBytes(Uint8Array.of(0xc3, 0x28)),
    WorkspaceRegistryCodecError,
  )
})

test('the registry store publishes an initial file durably and rejects concurrent or externally changed authority', async () => {
  const fixture = await createFixture('cas')
  try {
    const firstStore = createWorkspaceRegistryStore({
      appDataRoot: fixture.appDataRoot,
    })
    const secondStore = createWorkspaceRegistryStore({
      appDataRoot: fixture.appDataRoot,
    })
    const missing = await firstStore.read()
    assert.equal(missing.status, 'missing')
    if (missing.status !== 'missing') assert.fail('registry must be missing')

    const candidates = [
      registry(firstWorkspaceId, fixture.firstRoot),
      registry(secondWorkspaceId, fixture.secondRoot),
    ]
    const results = await Promise.all(
      candidates.map((candidate, index) =>
        [firstStore, secondStore][index]!.compareAndReplace({
          expectedAuthority: null,
          registry: candidate,
        }),
      ),
    )
    assert.equal(
      results.filter((result) => result.status === 'written').length,
      1,
    )
    assert.equal(
      results.filter((result) => result.status === 'conflict').length,
      1,
    )
    const winner = results.find((result) => result.status === 'written')
    assert.ok(winner)
    const registryPath = path.join(
      fixture.appDataRoot,
      'state/workspace-registry.json',
    )
    assert.deepEqual(
      decodeWorkspaceRegistryBytes(await readFile(registryPath)),
      winner.registry,
    )
    assert.equal((await lstat(registryPath)).mode & 0o777, 0o600)

    const opened = await firstStore.read()
    assert.equal(opened.status, 'current')
    if (opened.status !== 'current') assert.fail('registry must exist')
    const external =
      opened.registry.activeWorkspaceId === firstWorkspaceId
        ? registry(secondWorkspaceId, fixture.secondRoot)
        : registry(firstWorkspaceId, fixture.firstRoot)
    await writeFile(registryPath, encodeWorkspaceRegistry(external))

    assert.deepEqual(
      await firstStore.compareAndReplace({
        expectedAuthority: opened.authority,
        registry: registry(firstWorkspaceId, fixture.firstRoot),
      }),
      { status: 'conflict' },
    )
    assert.deepEqual(await readFile(registryPath), encodeWorkspaceRegistry(external))
  } finally {
    await fixture.cleanup()
  }
})

test('replacement compares the opened bytes immediately before atomic replace and preserves an external winner', async () => {
  const fixture = await createFixture('external-conflict')
  try {
    const initialStore = createWorkspaceRegistryStore({
      appDataRoot: fixture.appDataRoot,
    })
    const initial = await initialStore.compareAndReplace({
      expectedAuthority: null,
      registry: registry(firstWorkspaceId, fixture.firstRoot),
    })
    assert.equal(initial.status, 'written')
    if (initial.status !== 'written') assert.fail('initial write must win')

    const external = registry(secondWorkspaceId, fixture.secondRoot)
    const registryPath = path.join(
      fixture.appDataRoot,
      'state/workspace-registry.json',
    )
    const externalStage = path.join(
      fixture.appDataRoot,
      'state/external-registry.json',
    )
    const replacingStore = createWorkspaceRegistryStore({
      appDataRoot: fixture.appDataRoot,
      async fault(point) {
        if (point !== 'before_final_compare') return
        await writeFile(externalStage, encodeWorkspaceRegistry(external))
        await rename(externalStage, registryPath)
      },
    })

    assert.deepEqual(
      await replacingStore.compareAndReplace({
        expectedAuthority: initial.authority,
        registry: {
          ...initial.registry,
          activeWorkspaceId: null,
        },
      }),
      { status: 'conflict' },
    )
    assert.deepEqual(await readFile(registryPath), encodeWorkspaceRegistry(external))
  } finally {
    await fixture.cleanup()
  }
})

test('actual process death leaves one complete registry and the next writer reconciles owned residue', async () => {
  const fixture = await createFixture('process-death')
  try {
    const first = registry(firstWorkspaceId, fixture.firstRoot)
    await runCrashWriter({
      appDataRoot: fixture.appDataRoot,
      expectedAuthority: null,
      registry: first,
      faultPoint: 'after_replace',
    })
    const store = createWorkspaceRegistryStore({
      appDataRoot: fixture.appDataRoot,
    })
    const afterInitialCrash = await store.read()
    assert.equal(afterInitialCrash.status, 'current')
    if (afterInitialCrash.status !== 'current') {
      assert.fail('initial crash must leave one complete registry')
    }
    assert.deepEqual(afterInitialCrash.registry, first)

    const inactive = { ...first, activeWorkspaceId: null }
    const recovered = await store.compareAndReplace({
      expectedAuthority: afterInitialCrash.authority,
      registry: inactive,
    })
    assert.equal(recovered.status, 'written')
    if (recovered.status !== 'written') {
      assert.fail('next writer must recover the dead lease')
    }

    await runCrashWriter({
      appDataRoot: fixture.appDataRoot,
      expectedAuthority: recovered.authority,
      registry: first,
      faultPoint: 'after_temporary_sync',
    })
    const afterReplacementCrash = await store.read()
    assert.equal(afterReplacementCrash.status, 'current')
    if (afterReplacementCrash.status !== 'current') {
      assert.fail('replacement crash must preserve the old registry')
    }
    assert.deepEqual(afterReplacementCrash.registry, inactive)
    const final = await store.compareAndReplace({
      expectedAuthority: afterReplacementCrash.authority,
      registry: first,
    })
    assert.equal(final.status, 'written')
    assert.deepEqual(
      (await readdir(path.join(fixture.appDataRoot, 'state'))).sort(),
      ['workspace-registry.json'],
    )
  } finally {
    await fixture.cleanup()
  }
})

test('process death before startup acceptance restores missing or previous registry authority', async () => {
  for (const mode of ['first-open', 'switch'] as const) {
    const fixture = await createFixture(`pending-${mode}`)
    try {
      await Promise.all([
        writeIdentity(fixture.firstRoot, firstWorkspaceId),
        writeIdentity(fixture.secondRoot, secondWorkspaceId),
      ])
      const store = createWorkspaceRegistryStore({
        appDataRoot: fixture.appDataRoot,
      })
      const previous =
        mode === 'switch'
          ? await store.commitActiveWorkspace({
              expectedAuthority: null,
              canonicalRoot: fixture.firstRoot,
              expectedWorkspaceId: firstWorkspaceId,
            })
          : undefined
      if (previous && previous.status !== 'written') {
        assert.fail('previous authority must be written')
      }
      const before =
        previous?.status === 'written'
          ? Buffer.from(previous.authority.openedBytes)
          : undefined
      await runCrashWriter({
        appDataRoot: fixture.appDataRoot,
        expectedAuthority:
          previous?.status === 'written' ? previous.authority : null,
        registry: registry(secondWorkspaceId, fixture.secondRoot),
        faultPoint: 'after_directory_sync',
        activeCommit: {
          canonicalRoot: fixture.secondRoot,
          expectedWorkspaceId: secondWorkspaceId,
        },
      })

      const trigger = await store.commitActiveWorkspace({
        expectedAuthority:
          previous?.status === 'written' ? previous.authority : null,
        canonicalRoot: fixture.firstRoot,
        expectedWorkspaceId: firstWorkspaceId,
        acceptCommit: () => false,
      })
      assert.equal(trigger.status, 'conflict')
      const restored = await store.read()
      if (mode === 'first-open') {
        assert.equal(restored.status, 'missing')
      } else {
        assert.equal(restored.status, 'current')
        if (restored.status !== 'current' || !before) {
          assert.fail('previous authority must be restored')
        }
        assert.deepEqual(
          Buffer.from(restored.authority.openedBytes),
          before,
        )
      }
    } finally {
      await fixture.cleanup()
    }
  }
})

test('fresh reopen only returns a registry entry whose canonical root still has the matching v4 identity', async () => {
  const fixture = await createFixture('reopen')
  try {
    await writeIdentity(fixture.firstRoot, firstWorkspaceId)
    const store = createWorkspaceRegistryStore({
      appDataRoot: fixture.appDataRoot,
    })
    const written = await store.compareAndReplace({
      expectedAuthority: null,
      registry: registry(firstWorkspaceId, fixture.firstRoot),
    })
    assert.equal(written.status, 'written')

    const available = await store.resolveActiveWorkspace()
    assert.equal(available.status, 'available')
    if (available.status !== 'available') {
      assert.fail('active workspace must reopen')
    }
    assert.equal(available.workspace.workspaceId, firstWorkspaceId)
    assert.equal(available.canonicalRoot, fixture.firstRoot)

    await writeIdentity(fixture.firstRoot, secondWorkspaceId)
    assert.deepEqual(await store.resolveActiveWorkspace(), {
      status: 'unavailable',
      workspaceId: firstWorkspaceId,
      reason: 'identity_mismatch',
    })

    await rm(fixture.firstRoot, { recursive: true })
    assert.deepEqual(await store.resolveActiveWorkspace(), {
      status: 'unavailable',
      workspaceId: firstWorkspaceId,
      reason: 'root_unavailable',
    })
  } finally {
    await fixture.cleanup()
  }
})

test('registry loss followed by explicit reselect preserves workspace identity and Git-owned bytes while re-registering the canonical root', async () => {
  const fixture = await createFixture('reselect')
  try {
    const statePath = await writeIdentity(
      fixture.firstRoot,
      firstWorkspaceId,
    )
    const gitBytesPath = path.join(fixture.firstRoot, '.git/HEAD')
    await mkdir(path.dirname(gitBytesPath))
    await writeFile(gitBytesPath, 'ref: refs/heads/main\n')
    const beforeState = await readFile(statePath)
    const beforeGit = await readFile(gitBytesPath)
    const store = createWorkspaceRegistryStore({
      appDataRoot: fixture.appDataRoot,
    })

    const selected = await store.commitActiveWorkspace({
      expectedAuthority: null,
      canonicalRoot: fixture.firstRoot,
      expectedWorkspaceId: firstWorkspaceId,
    })
    assert.equal(selected.status, 'written')
    if (selected.status !== 'written') assert.fail('reselect must write')
    assert.equal(
      selected.registry.activeWorkspaceId,
      firstWorkspaceId,
    )
    assert.deepEqual(await readFile(statePath), beforeState)
    assert.deepEqual(await readFile(gitBytesPath), beforeGit)
  } finally {
    await fixture.cleanup()
  }
})

test('active commit rejects a root identity that differs from the verified workspace', async () => {
  const fixture = await createFixture('expected-workspace')
  try {
    await writeIdentity(fixture.firstRoot, firstWorkspaceId)
    const store = createWorkspaceRegistryStore({
      appDataRoot: fixture.appDataRoot,
    })

    assert.deepEqual(
      await store.commitActiveWorkspace({
        expectedAuthority: null,
        canonicalRoot: fixture.firstRoot,
        expectedWorkspaceId: secondWorkspaceId,
      }),
      { status: 'conflict' },
    )
    assert.equal((await store.read()).status, 'missing')
  } finally {
    await fixture.cleanup()
  }
})

test('declined commit acceptance restores the exact previous active bytes', async () => {
  const fixture = await createFixture('declined-acceptance')
  try {
    await Promise.all([
      writeIdentity(fixture.firstRoot, firstWorkspaceId),
      writeIdentity(fixture.secondRoot, secondWorkspaceId),
    ])
    const store = createWorkspaceRegistryStore({
      appDataRoot: fixture.appDataRoot,
    })
    const first = await store.commitActiveWorkspace({
      expectedAuthority: null,
      canonicalRoot: fixture.firstRoot,
      expectedWorkspaceId: firstWorkspaceId,
    })
    assert.equal(first.status, 'written')
    if (first.status !== 'written') assert.fail('first commit must win')
    const before = Buffer.from(first.authority.openedBytes)

    assert.deepEqual(
      await store.commitActiveWorkspace({
        expectedAuthority: first.authority,
        canonicalRoot: fixture.secondRoot,
        expectedWorkspaceId: secondWorkspaceId,
        acceptCommit: () => false,
      }),
      { status: 'conflict' },
    )
    const restored = await store.read()
    assert.equal(restored.status, 'current')
    if (restored.status !== 'current') {
      assert.fail('previous registry must be restored')
    }
    assert.deepEqual(Buffer.from(restored.authority.openedBytes), before)
    assert.equal(restored.registry.activeWorkspaceId, firstWorkspaceId)
  } finally {
    await fixture.cleanup()
  }
})

test('malformed and future registry bytes remain byte-for-byte incompatible and are never reset to empty', async () => {
  const fixture = await createFixture('incompatible')
  try {
    const registryPath = path.join(
      fixture.appDataRoot,
      'state/workspace-registry.json',
    )
    await mkdir(path.dirname(registryPath), { mode: 0o700 })
    const store = createWorkspaceRegistryStore({
      appDataRoot: fixture.appDataRoot,
    })

    for (const [bytes, reason] of [
      [Buffer.from('{"formatVersion":1,', 'utf8'), 'malformed'],
      [
        Buffer.from(
          '{"kind":"ay-ple.workspace-registry","formatVersion":2}\n',
          'utf8',
        ),
        'unsupported',
      ],
    ] as const) {
      await writeFile(registryPath, bytes)
      assert.deepEqual(await store.read(), {
        status: 'incompatible',
        reason,
      })
      assert.deepEqual(
        await store.compareAndReplace({
          expectedAuthority: null,
          registry: registry(firstWorkspaceId, fixture.firstRoot),
        }),
        { status: 'conflict' },
      )
      assert.deepEqual(await readFile(registryPath), bytes)
    }
  } finally {
    await fixture.cleanup()
  }
})

function registry(workspaceId: string, canonicalRoot: string) {
  return {
    kind: 'ay-ple.workspace-registry' as const,
    formatVersion: 1 as const,
    activeWorkspaceId: workspaceId,
    workspaces: [{ workspaceId, canonicalRoot }],
  }
}

async function writeIdentity(root: string, workspaceId: string) {
  const target = path.join(root, 'workspace-state.json')
  await writeFile(
    target,
    encodeSemesterWorkspaceStateV4(
      createInitialSemesterWorkspaceStateV4({
        workspaceId,
        semester: {
          yearLevel: 2,
          term: { key: 'fall', displayName: '2학기' },
        },
      }),
    ),
  )
  return target
}

async function createFixture(name: string) {
  const parent = await mkdtemp(
    path.join(tmpdir(), `ay-ple-workspace-registry-${name}-`),
  )
  const appDataRoot = path.join(parent, 'app-data')
  const firstRoot = path.join(parent, 'semester-one')
  const secondRoot = path.join(parent, 'semester-two')
  await Promise.all([
    mkdir(appDataRoot, { mode: 0o700 }),
    mkdir(firstRoot),
    mkdir(secondRoot),
  ])
  return {
    appDataRoot: await realpath(appDataRoot),
    firstRoot: await realpath(firstRoot),
    secondRoot: await realpath(secondRoot),
    cleanup: () => rm(parent, { force: true, recursive: true }),
  }
}

async function runCrashWriter(input: {
  readonly appDataRoot: string
  readonly expectedAuthority:
    | { readonly openedBytes: Uint8Array }
    | null
  readonly registry: ReturnType<typeof registry>
  readonly faultPoint:
    | 'after_temporary_sync'
    | 'after_replace'
    | 'after_directory_sync'
  readonly activeCommit?: {
    readonly canonicalRoot: string
    readonly expectedWorkspaceId: string
  }
}): Promise<void> {
  const worker = fileURLToPath(
    new URL(
      './testing/workspace-registry-crash-worker.ts',
      import.meta.url,
    ),
  )
  const child = spawn(
    fileURLToPath(
      new URL('../../../node_modules/.bin/tsx', import.meta.url),
    ),
    [
      worker,
      input.appDataRoot,
      input.expectedAuthority === null
        ? 'null'
        : Buffer.from(
            input.expectedAuthority.openedBytes,
          ).toString('base64url'),
      Buffer.from(JSON.stringify(input.registry), 'utf8').toString(
        'base64url',
      ),
      input.faultPoint,
      input.activeCommit ? 'active' : 'compare',
      input.activeCommit?.canonicalRoot ?? '',
      input.activeCommit?.expectedWorkspaceId ?? '',
    ],
    {
      cwd: fileURLToPath(new URL('../../..', import.meta.url)),
      env: {
        ...process.env,
        NODE_OPTIONS: '--conditions=development',
      },
      stdio: ['ignore', 'ignore', 'pipe'],
    },
  )
  let stderr = ''
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk
  })
  const exit = await new Promise<{
    readonly code: number | null
    readonly signal: NodeJS.Signals | null
  }>((resolve) => {
    child.once('close', (code, signal) => resolve({ code, signal }))
  })
  assert.ok(
    (exit.code === null && exit.signal === 'SIGKILL') ||
      (exit.code === 137 && exit.signal === null),
    stderr || JSON.stringify(exit),
  )
}
