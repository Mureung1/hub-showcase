import assert from 'node:assert/strict'
import {
  lstat,
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

import { resolveCanonicalProductRoots } from './product-roots.js'

test('resolves canonical package, external app data, global Codex, controlled state, and optional workspace ownership', async () => {
  const parent = await mkdtemp(path.join(tmpdir(), 'ay-ple-product-roots-'))
  const packageRoot = path.join(parent, 'hub')
  const globalHome = path.join(parent, 'user-home')
  const globalCodexHome = path.join(globalHome, '.codex')
  const workspaceRoot = path.join(parent, 'semester')

  try {
    await Promise.all([
      mkdir(packageRoot),
      mkdir(globalCodexHome, { recursive: true }),
      mkdir(workspaceRoot),
    ])
    const canonicalParent = await realpath(parent)
    const canonicalPackageRoot = path.join(canonicalParent, 'hub')
    const canonicalWorkspaceRoot = path.join(canonicalParent, 'semester')
    const canonicalAppDataRoot = path.join(canonicalParent, '.ay-ple')
    const canonicalGlobalCodexHome = path.join(
      canonicalParent,
      'user-home/.codex',
    )

    const roots = await resolveCanonicalProductRoots({
      environment: { HOME: globalHome },
      packageRoot,
      workspaceRoot,
    })

    assert.deepEqual(roots, {
      packageRoot: canonicalPackageRoot,
      appDataRoot: canonicalAppDataRoot,
      runtimeRoot: path.join(
        canonicalAppDataRoot,
        'runtime/production-runtime-darwin-arm64',
      ),
      runtimeCacheRoot: path.join(
        canonicalAppDataRoot,
        'cache/production-runtime',
      ),
      globalCodexHome: canonicalGlobalCodexHome,
      runtimeHome: path.join(canonicalAppDataRoot, 'state/runtime/home'),
      tempDirectory: path.join(canonicalAppDataRoot, 'temp'),
      workspaceRoot: canonicalWorkspaceRoot,
      ownership: {
        packageRoot: 'application_package',
        appDataRoot: 'application_operating_data',
        runtimeRoot: 'verified_runtime',
        runtimeCacheRoot: 'materialization_cache',
        globalCodexHome: 'global_codex',
        runtimeHome: 'controlled_runtime_state',
        tempDirectory: 'controlled_runtime_state',
        workspaceRoot: 'user_workspace',
      },
    })
    await Promise.all([
      lstat(roots.appDataRoot),
      lstat(roots.runtimeHome),
      lstat(roots.tempDirectory),
    ])
  } finally {
    await rm(parent, { force: true, recursive: true })
  }
})

test('rejects overlap and symlink roots before creating app data or changing caller bytes', async () => {
  const parent = await mkdtemp(path.join(tmpdir(), 'ay-ple-product-roots-'))
  const packageRoot = path.join(parent, 'hub')
  const globalCodexHome = path.join(parent, 'global-codex')
  const workspaceRoot = path.join(packageRoot, 'semester')
  const appDataRoot = path.join(parent, '.ay-ple')
  const sentinel = path.join(parent, 'sentinel.txt')

  try {
    await mkdir(packageRoot)
    await Promise.all([
      mkdir(globalCodexHome),
      mkdir(workspaceRoot),
      writeFile(sentinel, 'preserve\n'),
    ])

    await assert.rejects(
      resolveCanonicalProductRoots({
        environment: { CODEX_HOME: globalCodexHome },
        packageRoot,
        workspaceRoot,
      }),
      /roots must not overlap/,
    )
    await assert.rejects(lstat(appDataRoot), { code: 'ENOENT' })
    assert.equal(await readFile(sentinel, 'utf8'), 'preserve\n')

    const workspaceAlias = path.join(parent, 'semester-alias')
    const externalWorkspace = path.join(parent, 'external-semester')
    await mkdir(externalWorkspace)
    await symlink(externalWorkspace, workspaceAlias)
    await assert.rejects(
      resolveCanonicalProductRoots({
        environment: { CODEX_HOME: globalCodexHome },
        packageRoot,
        workspaceRoot: workspaceAlias,
      }),
      /workspace root must be a non-symlink directory/,
    )
    await assert.rejects(lstat(appDataRoot), { code: 'ENOENT' })
  } finally {
    await rm(parent, { force: true, recursive: true })
  }
})

test('does not treat ambient cwd or CODEX_CHAT_WORKSPACE as workspace selection', async () => {
  const parent = await mkdtemp(path.join(tmpdir(), 'ay-ple-product-roots-'))
  const packageRoot = path.join(parent, 'hub')
  const globalCodexHome = path.join(parent, 'global-codex')
  const poisonWorkspace = path.join(parent, 'legacy-workspace')

  try {
    await Promise.all([
      mkdir(packageRoot),
      mkdir(globalCodexHome),
      mkdir(poisonWorkspace),
    ])
    const roots = await resolveCanonicalProductRoots({
      environment: {
        CODEX_CHAT_WORKSPACE: poisonWorkspace,
        CODEX_HOME: globalCodexHome,
      },
      packageRoot,
    })

    assert.equal(roots.workspaceRoot, undefined)
  } finally {
    await rm(parent, { force: true, recursive: true })
  }
})
