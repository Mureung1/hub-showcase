import assert from 'node:assert/strict'
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  prepareDogfoodProfile,
  resolveDogfoodArguments,
  runDogfood,
} from './product-dogfood.mjs'

const repositoryRoot = path.resolve(import.meta.dirname, '..')
const sampleWorkspaceRoot = path.join(
  repositoryRoot,
  'apps/chat-shell/e2e/fixtures/first-assignment-semester-workspace',
)

test('persistent dogfood profile prepares sample data once and preserves later workspace state', async () => {
  const testRoot = await mkdtemp(path.join(tmpdir(), 'ay-ple-dogfood-test-'))
  const profileRoot = path.join(testRoot, 'profile')

  try {
    const canonicalProfileRoot = await realpath(testRoot).then((root) =>
      path.join(root, 'profile'),
    )
    const first = await prepareDogfoodProfile({
      packageRoot: repositoryRoot,
      profileRoot,
    })
    assert.deepEqual(first, {
      appDataRoot: path.join(canonicalProfileRoot, 'app-data'),
      profileRoot: canonicalProfileRoot,
      workspaceRoot: path.join(canonicalProfileRoot, 'semester-workspace'),
    })
    assert.equal(
      await readFile(
        path.join(first.workspaceRoot, 'lms-outline-notice.txt'),
        'utf8',
      ),
      await readFile(
        path.join(sampleWorkspaceRoot, 'lms-outline-notice.txt'),
        'utf8',
      ),
    )
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

    const second = await prepareDogfoodProfile({
      packageRoot: repositoryRoot,
      profileRoot,
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

test('existing dogfood data requires explicit one-time adoption and remains unchanged', async () => {
  const testRoot = await mkdtemp(path.join(tmpdir(), 'ay-ple-dogfood-test-'))
  const profileRoot = path.join(testRoot, 'profile')
  const appDataRoot = path.join(profileRoot, 'app-data')
  const workspaceRoot = path.join(profileRoot, 'semester-workspace')

  try {
    await mkdir(appDataRoot, { mode: 0o700, recursive: true })
    await mkdir(workspaceRoot)
    await writeFile(
      path.join(workspaceRoot, 'existing-work.txt'),
      'preserve me\n',
      'utf8',
    )

    await assert.rejects(
      prepareDogfoodProfile({ packageRoot: repositoryRoot, profileRoot }),
      /ownership marker is missing/,
    )

    const adopted = await prepareDogfoodProfile({
      adoptExisting: true,
      packageRoot: repositoryRoot,
      profileRoot,
    })
    assert.equal(
      await readFile(
        path.join(adopted.workspaceRoot, 'existing-work.txt'),
        'utf8',
      ),
      'preserve me\n',
    )

    assert.deepEqual(
      await prepareDogfoodProfile({
        packageRoot: repositoryRoot,
        profileRoot,
      }),
      adopted,
    )
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})

test('dogfood profile resolves a symlinked parent before package overlap checks', async () => {
  const testRoot = await mkdtemp(path.join(tmpdir(), 'ay-ple-dogfood-test-'))
  const packageRoot = path.join(testRoot, 'package')
  const sampleRoot = path.join(
    packageRoot,
    'apps/chat-shell/e2e/fixtures/first-assignment-semester-workspace',
  )
  const packageAlias = path.join(testRoot, 'package-alias')
  const profileRoot = path.join(packageAlias, 'profile')

  try {
    await mkdir(sampleRoot, { recursive: true })
    await writeFile(path.join(sampleRoot, 'sample.txt'), 'sample\n', 'utf8')
    await symlink(packageRoot, packageAlias)

    await assert.rejects(
      prepareDogfoodProfile({ packageRoot, profileRoot }),
      /Product roots cannot overlap/,
    )
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})

test('dogfood CLI requires one absolute profile root and recognizes explicit adoption', () => {
  assert.deepEqual(
    resolveDogfoodArguments(['--root', '/tmp/ay-ple-dogfood']),
    {
      adoptExisting: false,
      profileRoot: '/tmp/ay-ple-dogfood',
    },
  )
  assert.deepEqual(
    resolveDogfoodArguments([
      '--adopt-existing',
      '--root',
      '/tmp/ay-ple-dogfood',
    ]),
    {
      adoptExisting: true,
      profileRoot: '/tmp/ay-ple-dogfood',
    },
  )
  assert.throws(() => resolveDogfoodArguments([]), /Usage: npm run dogfood/)
  assert.throws(
    () => resolveDogfoodArguments(['--root', 'relative']),
    /absolute profile root/,
  )
  assert.throws(
    () =>
      resolveDogfoodArguments([
        '--root',
        '/tmp/one',
        '--root',
        '/tmp/two',
      ]),
    /Usage: npm run dogfood/,
  )
})

test('dogfood run delegates persistent roots and global Codex state to canonical product development', async () => {
  const testRoot = await mkdtemp(path.join(tmpdir(), 'ay-ple-dogfood-test-'))
  const profileRoot = path.join(testRoot, 'profile')

  try {
    const prepared = await prepareDogfoodProfile({
      packageRoot: repositoryRoot,
      profileRoot,
    })
    let delegated:
      | {
          readonly arguments: readonly string[]
          readonly environment: NodeJS.ProcessEnv
        }
      | undefined

    await runDogfood({
      arguments: ['--root', profileRoot],
      environment: { CODEX_HOME: '/global/codex-home', KEEP_ME: 'yes' },
      log: () => undefined,
      packageRoot: repositoryRoot,
      startProductDevelopment: async (options) => {
        delegated = options
      },
    })

    assert.deepEqual(delegated?.arguments, [
      '--app-data-root',
      prepared.appDataRoot,
    ])
    assert.equal(delegated?.environment.KEEP_ME, 'yes')
    assert.equal(delegated?.environment.CODEX_HOME, '/global/codex-home')
    assert.equal(
      delegated?.environment.CODEX_CHAT_WORKSPACE,
      prepared.workspaceRoot,
    )
  } finally {
    await rm(testRoot, { force: true, recursive: true })
  }
})
