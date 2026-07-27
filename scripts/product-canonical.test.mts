import assert from 'node:assert/strict'
import { mkdir, mkdtemp, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  resolveCanonicalProductArguments,
  runCanonicalProduct,
} from './product-canonical.mjs'

test('canonical local startup defaults only app data and does not adopt ambient workspace input', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ay-ple-canonical-local-'))
  const packageRoot = path.join(root, 'hub')
  try {
    await mkdir(packageRoot)
    const canonicalPackageRoot = await realpath(packageRoot)
    const canonicalParent = path.dirname(canonicalPackageRoot)
    assert.deepEqual(
      resolveCanonicalProductArguments([], canonicalPackageRoot),
      {
        appDataRoot: path.join(canonicalParent, '.ay-ple'),
        workspaceRoot: undefined,
      },
    )

    let delegated:
      | {
          readonly appDataRoot: string
          readonly environment: NodeJS.ProcessEnv
          readonly workspaceRoot: string | undefined
        }
      | undefined
    await runCanonicalProduct({
      arguments: [],
      environment: {
        CODEX_CHAT_WORKSPACE: '/legacy/workspace',
        KEEP_ME: 'yes',
      },
      packageRoot: canonicalPackageRoot,
      startProductDevelopment: async (options) => {
        delegated = options
      },
    })

    assert.equal(
      delegated?.appDataRoot,
      path.join(canonicalParent, '.ay-ple'),
    )
    assert.equal(delegated?.workspaceRoot, undefined)
    assert.equal(delegated?.environment.KEEP_ME, 'yes')
    assert.equal(
      delegated?.environment.CODEX_CHAT_WORKSPACE,
      '/legacy/workspace',
    )
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('canonical local startup accepts an explicit workspace argument without a hardcoded fallback', () => {
  assert.deepEqual(
    resolveCanonicalProductArguments(
      ['--workspace', '/chosen/semester'],
      '/product/hub',
    ),
    {
      appDataRoot: '/product/.ay-ple',
      workspaceRoot: '/chosen/semester',
    },
  )
  assert.throws(
    () =>
      resolveCanonicalProductArguments(
        ['--workspace', 'relative/semester'],
        '/product/hub',
      ),
    /workspace must be an explicit absolute directory/,
  )
})
