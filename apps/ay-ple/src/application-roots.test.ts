import assert from 'node:assert/strict'
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import type {
  AdmittedSemesterWorkspace,
} from '@ay-ple/semester-workspace'

import {
  ApplicationRootsError,
  createApplicationRootsForTesting,
  createPublicPreviewWorkspaceTargetGuard,
  readApplicationUserRecord,
} from './application-roots.js'

test('creates owner-only application roots from the OS user home and never from HOME', async () => {
  const fixture = await createRootFixture()
  const previousHome = process.env.HOME
  process.env.HOME = path.join(fixture.root, 'poison-home')
  try {
    const roots = await createApplicationRootsForTesting(
      { packageRoot: fixture.packageRoot },
      {
        userInfo: () => ({
          homedir: fixture.userHome,
          uid: process.getuid!(),
        }),
      },
    )

    assert.equal(
      roots.appDataRoot,
      path.join(
        fixture.userHome,
        'Library',
        'Application Support',
        'AY-PLE',
      ),
    )
    assert.equal(
      roots.appDataRoot.startsWith(process.env.HOME),
      false,
    )
    for (const root of [
      roots.appDataRoot,
      ...roots.controlledRootPaths,
    ]) {
      const stat = await lstat(root)
      assert.equal(stat.isDirectory(), true)
      assert.equal(stat.isSymbolicLink(), false)
      assert.equal(stat.mode & 0o777, 0o700)
      assert.equal(stat.uid, process.getuid!())
    }
    await assert.rejects(
      lstat(path.join(roots.appDataRoot, 'runtime-cache')),
      { code: 'ENOENT' },
    )
    assert.equal(roots.admittedWorkspace, null)
  } finally {
    if (previousHome === undefined) {
      delete process.env.HOME
    } else {
      process.env.HOME = previousHome
    }
    await fixture.cleanup()
  }
})

test('reopens exact safe roots and preserves the admitted workspace reference', async () => {
  const fixture = await createRootFixture()
  const workspace = await createAdmittedWorkspace(
    path.join(fixture.root, 'semester'),
  )
  try {
    const dependencies = {
      userInfo: () => ({
        homedir: fixture.userHome,
        uid: process.getuid!(),
      }),
    }
    const first = await createApplicationRootsForTesting(
      {
        packageRoot: fixture.packageRoot,
        admittedWorkspace: workspace,
      },
      dependencies,
    )
    const second = await createApplicationRootsForTesting(
      {
        packageRoot: fixture.packageRoot,
        admittedWorkspace: workspace,
      },
      dependencies,
    )

    assert.equal(first.admittedWorkspace, workspace)
    assert.equal(second.admittedWorkspace, workspace)
    assert.equal(
      first.admittedWorkspaceCanonicalRoot,
      workspace.canonicalRoot,
    )
    assert.equal(first.appDataRoot, second.appDataRoot)
    assert.deepEqual(
      first.controlledRootPaths,
      second.controlledRootPaths,
    )
  } finally {
    await fixture.cleanup()
  }
})

test('fails closed for unsafe existing app-data type, link, mode, and owner', async (t) => {
  const cases: Array<{
    readonly name: string
    readonly prepare: (fixture: Awaited<ReturnType<typeof createRootFixture>>) => Promise<number>
  }> = [
    {
      name: 'file',
      prepare: async (fixture) => {
        await writeFile(fixture.appDataRoot, 'not a directory')
        return process.getuid!()
      },
    },
    {
      name: 'symlink',
      prepare: async (fixture) => {
        const target = path.join(fixture.root, 'elsewhere')
        await mkdir(target, { mode: 0o700 })
        await symlink(target, fixture.appDataRoot)
        return process.getuid!()
      },
    },
    {
      name: 'broad mode',
      prepare: async (fixture) => {
        await mkdir(fixture.appDataRoot, { mode: 0o700 })
        await chmod(fixture.appDataRoot, 0o755)
        return process.getuid!()
      },
    },
    {
      name: 'different owner authority',
      prepare: async (fixture) => {
        await mkdir(fixture.appDataRoot, { mode: 0o700 })
        return process.getuid!() + 1
      },
    },
    {
      name: 'linked controlled root',
      prepare: async (fixture) => {
        await mkdir(fixture.appDataRoot, { mode: 0o700 })
        const outside = path.join(fixture.root, 'outside-runtime')
        await mkdir(outside, { mode: 0o700 })
        await symlink(
          outside,
          path.join(fixture.appDataRoot, 'runtime'),
        )
        return process.getuid!()
      },
    },
  ]

  for (const fixtureCase of cases) {
    await t.test(fixtureCase.name, async () => {
      const fixture = await createRootFixture()
      try {
        const uid = await fixtureCase.prepare(fixture)
        await assert.rejects(
          createApplicationRootsForTesting(
            { packageRoot: fixture.packageRoot },
            {
              userInfo: () => ({
                homedir: fixture.userHome,
                uid,
              }),
            },
          ),
          (error: unknown) =>
            error instanceof ApplicationRootsError &&
            error.code === 'unsafe_app_data_root',
        )
      } finally {
        await fixture.cleanup()
      }
    })
  }
})

test('rejects package, app-data, workspace, and controlled-root overlap before child creation', async (t) => {
  await t.test('package inside planned app-data root', async () => {
    const fixture = await createRootFixture()
    const nestedPackage = path.join(fixture.appDataRoot, 'package')
    try {
      await mkdir(nestedPackage, { mode: 0o700, recursive: true })
      await assert.rejects(
        createApplicationRootsForTesting(
          { packageRoot: nestedPackage },
          {
            userInfo: () => ({
              homedir: fixture.userHome,
              uid: process.getuid!(),
            }),
          },
        ),
        hasRootsCode('overlapping_roots'),
      )
    } finally {
      await fixture.cleanup()
    }
  })

  await t.test('workspace contains package root', async () => {
    const fixture = await createRootFixture()
    const workspace = workspaceHandle(
      path.dirname(fixture.packageRoot),
    )
    try {
      await assert.rejects(
        createApplicationRootsForTesting(
          {
            packageRoot: fixture.packageRoot,
            admittedWorkspace: workspace,
          },
          {
            userInfo: () => ({
              homedir: fixture.userHome,
              uid: process.getuid!(),
            }),
          },
        ),
        hasRootsCode('overlapping_roots'),
      )
      await assert.rejects(lstat(fixture.appDataRoot), {
        code: 'ENOENT',
      })
    } finally {
      await fixture.cleanup()
    }
  })
})

test('target guard is total, snapshots mutable input, and only owns protected-root overlap', async () => {
  const fixture = await createRootFixture()
  try {
    const roots = await createApplicationRootsForTesting(
      { packageRoot: fixture.packageRoot },
      {
        userInfo: () => ({
          homedir: fixture.userHome,
          uid: process.getuid!(),
        }),
      },
    )
    const guard = createPublicPreviewWorkspaceTargetGuard(roots)
    const safeParent = path.join(fixture.root, 'safe-parent')
    await mkdir(safeParent, { mode: 0o700 })

    assert.equal(
      guard({ canonicalParent: safeParent, leafName: 'semester' }),
      'allowed',
    )
    assert.equal(
      guard({
        canonicalParent: path.dirname(roots.packageRoot),
        leafName: path.basename(roots.packageRoot),
      }),
      'blocked',
    )
    assert.equal(
      guard({
        canonicalParent: roots.packageRoot,
        leafName: 'nested',
      }),
      'blocked',
    )
    assert.equal(
      guard({
        canonicalParent: fixture.root,
        leafName: '.',
      }),
      'blocked',
    )

    let leaf = 'semester'
    const mutable = {
      canonicalParent: safeParent,
      get leafName() {
        const current = leaf
        leaf = path.relative(safeParent, roots.packageRoot)
        return current
      },
    }
    assert.equal(guard(mutable), 'allowed')
    assert.equal(leaf.includes('package'), true)
    assert.equal(
      guard(null as never),
      'blocked',
    )
    assert.equal(
      guard({
        get canonicalParent(): string {
          throw new Error('hostile getter')
        },
        leafName: 'semester',
      }),
      'blocked',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('target guard preserves the validated workspace root if the exact handle is later mutated', async () => {
  const fixture = await createRootFixture()
  const originalWorkspaceRoot = path.join(fixture.root, 'semester')
  const mutatedWorkspaceRoot = path.join(fixture.root, 'other-semester')
  const workspace = await createAdmittedWorkspace(
    originalWorkspaceRoot,
  )
  await mkdir(mutatedWorkspaceRoot, { mode: 0o700 })
  try {
    const roots = await createApplicationRootsForTesting(
      {
        packageRoot: fixture.packageRoot,
        admittedWorkspace: workspace,
      },
      {
        userInfo: () => ({
          homedir: fixture.userHome,
          uid: process.getuid!(),
        }),
      },
    )
    const mutableWorkspace = workspace as { canonicalRoot: string }
    mutableWorkspace.canonicalRoot = mutatedWorkspaceRoot
    const guard = createPublicPreviewWorkspaceTargetGuard(roots)

    assert.equal(roots.admittedWorkspace, workspace)
    assert.equal(
      roots.admittedWorkspaceCanonicalRoot,
      originalWorkspaceRoot,
    )
    assert.equal(
      guard({
        canonicalParent: path.dirname(originalWorkspaceRoot),
        leafName: path.basename(originalWorkspaceRoot),
      }),
      'blocked',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('detects an app-data pathname replacement after creation', async () => {
  const fixture = await createRootFixture()
  let swapped = false
  try {
    await assert.rejects(
      createApplicationRootsForTesting(
        { packageRoot: fixture.packageRoot },
        {
          userInfo: () => ({
            homedir: fixture.userHome,
            uid: process.getuid!(),
          }),
          async afterAppDataCreate(appDataRoot) {
            swapped = true
            const moved = `${appDataRoot}-moved`
            await rename(appDataRoot, moved)
            await mkdir(appDataRoot, { mode: 0o700 })
          },
        },
      ),
      hasRootsCode('unsafe_app_data_root'),
    )
    assert.equal(swapped, true)
  } finally {
    await fixture.cleanup()
  }
})

test('reads the OS user record without consulting HOME', () => {
  const previousHome = process.env.HOME
  process.env.HOME = '/tmp/ay-ple-poison-home'
  try {
    const user = readApplicationUserRecord()
    assert.notEqual(user.homedir, process.env.HOME)
    assert.equal(user.uid, process.getuid!())
  } finally {
    if (previousHome === undefined) {
      delete process.env.HOME
    } else {
      process.env.HOME = previousHome
    }
  }
})

async function createRootFixture() {
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), 'ay-ple-roots-')),
  )
  await chmod(root, 0o700)
  const userHome = path.join(root, 'user')
  const packageRoot = path.join(root, 'package')
  await mkdir(
    path.join(userHome, 'Library', 'Application Support'),
    { mode: 0o700, recursive: true },
  )
  await mkdir(packageRoot, { mode: 0o700 })
  return {
    root,
    userHome,
    packageRoot,
    appDataRoot: path.join(
      userHome,
      'Library',
      'Application Support',
      'AY-PLE',
    ),
    cleanup: () => rm(root, { recursive: true, force: true }),
  }
}

async function createAdmittedWorkspace(
  root: string,
): Promise<AdmittedSemesterWorkspace> {
  await mkdir(root, { mode: 0o700 })
  return workspaceHandle(root)
}

function workspaceHandle(
  canonicalRoot: string,
): AdmittedSemesterWorkspace {
  return {
    canonicalRoot,
    workspaceId: 'workspace_fixture',
    formatVersion: 3,
    manifest: {
      workspaceId: 'workspace_fixture',
      semester: {
        yearLevel: 2,
        term: { key: 'first', displayName: '1학기' },
      },
      courses: [],
    },
  }
}

function hasRootsCode(code: ApplicationRootsError['code']) {
  return (error: unknown) =>
    error instanceof ApplicationRootsError && error.code === code
}
