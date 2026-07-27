import assert from 'node:assert/strict'
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  prepareLocalProductProfile,
  resolveLocalProductArguments,
  runLocalProduct,
} from './product-local.mjs'

const repositoryRoot = path.resolve(import.meta.dirname, '..')
test('persistent local profile uses an empty external workspace and preserves later state', async () => {
  const testRoot = await mkdtemp(path.join(tmpdir(), 'ay-ple-dogfood-test-'))
  const profileRoot = path.join(testRoot, 'profile')
  const workspaceRoot = path.join(
    testRoot,
    'workspace/year-2-semester-2',
  )

  try {
    await mkdir(workspaceRoot, { recursive: true })
    const canonicalProfileRoot = await realpath(testRoot).then((root) =>
      path.join(root, 'profile'),
    )
    const canonicalWorkspaceRoot = await realpath(workspaceRoot)
    const first = await prepareLocalProductProfile({
      packageRoot: repositoryRoot,
      profileRoot,
      workspaceRoot,
    })
    assert.deepEqual(first, {
      appDataRoot: path.join(canonicalProfileRoot, 'app-data'),
      profileRoot: canonicalProfileRoot,
      workspaceRoot: canonicalWorkspaceRoot,
    })
    assert.deepEqual(await readdir(first.workspaceRoot), [])
    const productStateRoot = path.join(first.workspaceRoot, '.ay-ple')
    await mkdir(productStateRoot)
    await writeFile(
      path.join(productStateRoot, 'workspace-state.json'),
      '{"preserve":true}\n',
      'utf8',
    )
    await writeFile(
      path.join(first.workspaceRoot, 'student-added.txt'),
      'keep this material\n',
      'utf8',
    )

    const second = await prepareLocalProductProfile({
      packageRoot: repositoryRoot,
      profileRoot,
      workspaceRoot,
    })
    assert.deepEqual(second, first)
    assert.equal(
      await readFile(
        path.join(second.workspaceRoot, '.ay-ple/workspace-state.json'),
        'utf8',
      ),
      '{"preserve":true}\n',
    )
    assert.equal(
      await readFile(
        path.join(second.workspaceRoot, 'student-added.txt'),
        'utf8',
      ),
      'keep this material\n',
    )
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})

test('existing local data requires explicit one-time adoption and remains unchanged', async () => {
  const testRoot = await mkdtemp(path.join(tmpdir(), 'ay-ple-dogfood-test-'))
  const profileRoot = path.join(testRoot, 'profile')
  const appDataRoot = path.join(profileRoot, 'app-data')
  const workspaceRoot = path.join(testRoot, 'year-2-semester-2')

  try {
    await mkdir(appDataRoot, { mode: 0o700, recursive: true })
    await mkdir(workspaceRoot)
    await writeFile(
      path.join(workspaceRoot, 'existing-work.txt'),
      'preserve me\n',
      'utf8',
    )

    await assert.rejects(
      prepareLocalProductProfile({
        packageRoot: repositoryRoot,
        profileRoot,
        workspaceRoot,
      }),
      /ownership marker is missing/,
    )

    const adopted = await prepareLocalProductProfile({
      adoptExisting: true,
      packageRoot: repositoryRoot,
      profileRoot,
      workspaceRoot,
    })
    assert.equal(
      await readFile(
        path.join(adopted.workspaceRoot, 'existing-work.txt'),
        'utf8',
      ),
      'preserve me\n',
    )

    assert.deepEqual(
      await prepareLocalProductProfile({
        packageRoot: repositoryRoot,
        profileRoot,
        workspaceRoot,
      }),
      adopted,
    )
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})

test('local profile resolves a symlinked parent before package overlap checks', async () => {
  const testRoot = await mkdtemp(path.join(tmpdir(), 'ay-ple-dogfood-test-'))
  const packageRoot = path.join(testRoot, 'package')
  const packageAlias = path.join(testRoot, 'package-alias')
  const profileRoot = path.join(packageAlias, 'profile')
  const workspaceRoot = path.join(testRoot, 'workspace')

  try {
    await mkdir(packageRoot)
    await mkdir(workspaceRoot)
    await symlink(packageRoot, packageAlias)

    await assert.rejects(
      prepareLocalProductProfile({ packageRoot, profileRoot, workspaceRoot }),
      /Product roots cannot overlap/,
    )
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})

test('local CLI defaults to the personal relative roots and accepts overrides', () => {
  assert.deepEqual(resolveLocalProductArguments([]), {
    adoptExisting: false,
    profileRoot: '../.ay-ple-dogfood',
    workspaceRoot: '../workspace/year-2-semester-2',
  })
  assert.deepEqual(
    resolveLocalProductArguments([
      '--root',
      '../profile',
      '--workspace',
      '../workspace',
    ]),
    {
      adoptExisting: false,
      profileRoot: '../profile',
      workspaceRoot: '../workspace',
    },
  )
  assert.deepEqual(
    resolveLocalProductArguments([
      '--adopt-existing',
      '--root',
      '/tmp/ay-ple-dogfood',
    ]),
    {
      adoptExisting: true,
      profileRoot: '/tmp/ay-ple-dogfood',
      workspaceRoot: '../workspace/year-2-semester-2',
    },
  )
  assert.throws(
    () =>
      resolveLocalProductArguments([
        '--root',
        '/tmp/one',
        '--root',
        '/tmp/two',
      ]),
    /Usage: npm run dev/,
  )
  assert.throws(
    () => resolveLocalProductArguments(['--workspace']),
    /Usage: npm run dev/,
  )
})

test('local run delegates persistent roots and global Codex state to canonical product development', async () => {
  const testRoot = await mkdtemp(path.join(tmpdir(), 'ay-ple-dogfood-test-'))
  const packageRoot = path.join(testRoot, 'hub')
  const profileRoot = path.join(testRoot, '.ay-ple-dogfood')
  const workspaceRoot = path.join(
    testRoot,
    'workspace/year-2-semester-2',
  )

  try {
    await mkdir(packageRoot)
    await mkdir(workspaceRoot, { recursive: true })
    let delegated:
      | {
          readonly arguments: readonly string[]
          readonly environment: NodeJS.ProcessEnv
        }
      | undefined

    await runLocalProduct({
      arguments: [],
      environment: { CODEX_HOME: '/global/codex-home', KEEP_ME: 'yes' },
      log: () => undefined,
      packageRoot,
      startProductDevelopment: async (options) => {
        delegated = options
      },
    })
    const canonicalProfileRoot = await realpath(profileRoot)
    const canonicalWorkspaceRoot = await realpath(workspaceRoot)

    assert.deepEqual(delegated?.arguments, [
      '--app-data-root',
      path.join(canonicalProfileRoot, 'app-data'),
    ])
    assert.equal(delegated?.environment.KEEP_ME, 'yes')
    assert.equal(delegated?.environment.CODEX_HOME, '/global/codex-home')
    assert.equal(
      delegated?.environment.CODEX_CHAT_WORKSPACE,
      canonicalWorkspaceRoot,
    )
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})
