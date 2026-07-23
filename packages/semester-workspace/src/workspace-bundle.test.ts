import assert from 'node:assert/strict'
import {
  chmod,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import type {
  AdmittedSemesterWorkspace,
  VerifiedBundleSource,
} from './contract.js'
import { createSemesterWorkspaceAdmission } from './admission.js'
import {
  WorkspaceBundleSourceError,
  captureCanonicalWorkspaceBundleSource,
  captureWorkspaceBundleSourceAt,
  materializeWorkspaceBundle,
  recoverMissingWorkspaceBundle,
  verifyWorkspaceBundle,
} from './workspace-bundle.js'

const declaredSkillPath =
  '.agents/skills/ay-ple-first-assignment/SKILL.md'

test('canonical package resource is the exact reviewed two-file bundle', async () => {
  const source = await captureCanonicalWorkspaceBundleSource()
  const resourceRoot = new URL('../resources/workspace/', import.meta.url)

  assert.equal(source.descriptor.schemaVersion, 1)
  assert.equal(source.descriptor.bundleId, 'ay-ple.workspace-bundle.v1')
  assert.deepEqual(
    source.descriptor.roots.map(({ kind, root, skillName, entries }) => ({
      kind,
      root,
      skillName,
      entries: entries.map(({ relativePath }) => relativePath),
    })),
    [
      {
        kind: 'instructions',
        root: 'AGENTS.md',
        skillName: null,
        entries: ['AGENTS.md'],
      },
      {
        kind: 'skill',
        root: '.agents/skills/ay-ple-first-assignment',
        skillName: 'ay-ple-first-assignment',
        entries: ['SKILL.md'],
      },
    ],
  )
  assert.deepEqual(
    source.files.map(({ relativePath, mode }) => ({
      relativePath,
      mode,
    })),
    [
      { relativePath: '.agents/skills/ay-ple-first-assignment/SKILL.md', mode: '0644' },
      { relativePath: 'AGENTS.md', mode: '0644' },
    ],
  )
  assert.deepEqual(await completeTree(resourceRoot), [
    '.agents/skills/ay-ple-first-assignment/SKILL.md',
    'AGENTS.md',
  ])
  assert.match(
    (await readFile(new URL('AGENTS.md', resourceRoot), 'utf8')),
    /AY-PLE SemesterWorkspace/,
  )
  assert.match(
    (
      await readFile(
        new URL(declaredSkillPath, resourceRoot),
        'utf8',
      )
    ),
    /^---\nname: ay-ple-first-assignment\n/m,
  )
})

for (const drift of [
  'missing',
  'extra',
  'modified',
  'symlink',
  'mode',
] as const) {
  test(`package source verifier rejects ${drift} drift before workspace mutation`, async () => {
    const fixture = await createFixture()
    try {
      const sourceRoot = path.join(fixture.root, `source-${drift}`)
      await cp(fixture.canonicalSourceRoot, sourceRoot, {
        recursive: true,
        verbatimSymlinks: true,
      })
      const skillPath = path.join(sourceRoot, declaredSkillPath)
      if (drift === 'missing') {
        await unlink(skillPath)
      } else if (drift === 'extra') {
        await writeFile(
          path.join(path.dirname(skillPath), 'undeclared.md'),
          'undeclared source byte\n',
        )
      } else if (drift === 'modified') {
        await writeFile(skillPath, 'modified source byte\n')
      } else if (drift === 'symlink') {
        const external = path.join(fixture.root, 'external-source-skill.md')
        await writeFile(external, await readFile(skillPath))
        await unlink(skillPath)
        await symlink(external, skillPath, 'file')
      } else {
        await chmod(skillPath, 0o600)
      }
      const before = await completeTree(fixture.workspace.canonicalRoot)

      await assert.rejects(
        captureWorkspaceBundleSourceAt(sourceRoot),
        WorkspaceBundleSourceError,
      )

      assert.deepEqual(
        await completeTree(fixture.workspace.canonicalRoot),
        before,
      )
    } finally {
      await fixture.cleanup()
    }
  })
}

test('package source verifier rejects and preserves special permission bits', async () => {
  const fixture = await createFixture()
  try {
    const sourceRoot = path.join(fixture.root, 'source-special-mode')
    await cp(fixture.canonicalSourceRoot, sourceRoot, {
      recursive: true,
      verbatimSymlinks: true,
    })
    const skillPath = path.join(sourceRoot, declaredSkillPath)
    await chmod(skillPath, 0o4644)
    const beforeBytes = await readFile(skillPath)
    const beforeMode = (await lstat(skillPath)).mode & 0o7777
    assert.equal(beforeMode, 0o4644)
    const workspaceBefore = await completeTree(
      fixture.workspace.canonicalRoot,
    )

    await assert.rejects(
      captureWorkspaceBundleSourceAt(sourceRoot),
      WorkspaceBundleSourceError,
    )

    assert.deepEqual(await readFile(skillPath), beforeBytes)
    assert.equal((await lstat(skillPath)).mode & 0o7777, beforeMode)
    assert.deepEqual(
      await completeTree(fixture.workspace.canonicalRoot),
      workspaceBefore,
    )
  } finally {
    await fixture.cleanup()
  }
})

test('materializer uses the immutable verified snapshot after source bytes drift', async () => {
  const fixture = await createFixture()
  try {
    const sourceRoot = path.join(fixture.root, 'captured-source')
    await cp(fixture.canonicalSourceRoot, sourceRoot, {
      recursive: true,
      verbatimSymlinks: true,
    })
    const source = await captureWorkspaceBundleSourceAt(sourceRoot)
    const expected = fileBytes(source, 'AGENTS.md')
    await writeFile(
      path.join(sourceRoot, 'AGENTS.md'),
      'post-capture package cache drift\n',
    )

    const result = await materializeWorkspaceBundle({
      workspace: fixture.workspace,
      source,
    })

    assert.equal(result.status, 'verified')
    assert.deepEqual(
      await readFile(path.join(fixture.workspace.canonicalRoot, 'AGENTS.md')),
      expected,
    )
    assert.equal(
      (await verifyWorkspaceBundle({
        workspace: fixture.workspace,
        source,
      })).status,
      'verified',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('missing declared file is recovered only through explicit absent-only recovery', async () => {
  const fixture = await createFixture()
  try {
    const source = await captureCanonicalWorkspaceBundleSource()
    assert.equal(
      (
        await materializeWorkspaceBundle({
          workspace: fixture.workspace,
          source,
        })
      ).status,
      'verified',
    )
    const agentsPath = path.join(
      fixture.workspace.canonicalRoot,
      'AGENTS.md',
    )
    await unlink(agentsPath)

    const missing = await verifyWorkspaceBundle({
      workspace: fixture.workspace,
      source,
    })
    assert.equal(missing.status, 'missing')
    if (missing.status !== 'missing') assert.fail('expected missing bundle')
    assert.deepEqual(missing.missing, ['AGENTS.md'])
    assert.equal(
      (
        await materializeWorkspaceBundle({
          workspace: fixture.workspace,
          source,
        })
      ).status,
      'missing',
    )
    await assert.rejects(lstat(agentsPath), (error: unknown) => {
      return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      )
    })

    const recovered = await recoverMissingWorkspaceBundle({
      workspace: fixture.workspace,
      source,
    })
    assert.equal(recovered.status, 'verified')
    assert.deepEqual(await readFile(agentsPath), fileBytes(source, 'AGENTS.md'))
  } finally {
    await fixture.cleanup()
  }
})

for (const drift of ['modified', 'extra', 'symlink', 'mode'] as const) {
  test(`${drift} workspace drift is preserved as manual recovery`, async () => {
    const fixture = await createFixture()
    try {
      const source = await captureCanonicalWorkspaceBundleSource()
      await materializeWorkspaceBundle({
        workspace: fixture.workspace,
        source,
      })
      const skillPath = path.join(
        fixture.workspace.canonicalRoot,
        declaredSkillPath,
      )
      let preservedPath = skillPath
      if (drift === 'modified') {
        await writeFile(skillPath, 'student-modified skill byte\n')
      } else if (drift === 'extra') {
        preservedPath = path.join(path.dirname(skillPath), 'student-note.md')
        await writeFile(preservedPath, 'student extra byte\n')
      } else if (drift === 'symlink') {
        const external = path.join(fixture.root, 'student-skill.md')
        await writeFile(external, 'student symlink target byte\n')
        await unlink(skillPath)
        await symlink(external, skillPath, 'file')
      } else {
        await chmod(skillPath, 0o600)
      }
      const before = await readEntryBytes(preservedPath)

      const verified = await verifyWorkspaceBundle({
        workspace: fixture.workspace,
        source,
      })
      const recovered = await recoverMissingWorkspaceBundle({
        workspace: fixture.workspace,
        source,
      })

      assert.equal(verified.status, 'manual_recovery_required')
      assert.equal(recovered.status, 'manual_recovery_required')
      assert.deepEqual(await readEntryBytes(preservedPath), before)
    } finally {
      await fixture.cleanup()
    }
  })
}

test('installed special permission bits block materialize and recovery without byte drift', async () => {
  const fixture = await createFixture()
  try {
    const source = await captureCanonicalWorkspaceBundleSource()
    assert.equal(
      (
        await materializeWorkspaceBundle({
          workspace: fixture.workspace,
          source,
        })
      ).status,
      'verified',
    )
    const skillPath = path.join(
      fixture.workspace.canonicalRoot,
      declaredSkillPath,
    )
    await chmod(skillPath, 0o4644)
    const beforeBytes = await readFile(skillPath)
    const beforeMode = (await lstat(skillPath)).mode & 0o7777
    assert.equal(beforeMode, 0o4644)

    const verified = await verifyWorkspaceBundle({
      workspace: fixture.workspace,
      source,
    })
    const materialized = await materializeWorkspaceBundle({
      workspace: fixture.workspace,
      source,
    })
    const recovered = await recoverMissingWorkspaceBundle({
      workspace: fixture.workspace,
      source,
    })

    for (const result of [verified, materialized, recovered]) {
      assert.equal(result.status, 'manual_recovery_required')
      if (result.status !== 'manual_recovery_required') {
        assert.fail('expected manual recovery')
      }
      assert.deepEqual(result.conflicts, [
        {
          relativePath: declaredSkillPath,
          reason: 'mode',
        },
      ])
    }
    assert.deepEqual(await readFile(skillPath), beforeBytes)
    assert.equal((await lstat(skillPath)).mode & 0o7777, beforeMode)
  } finally {
    await fixture.cleanup()
  }
})

test('a caller-mutated snapshot is rejected without touching workspace bytes', async () => {
  const fixture = await createFixture()
  try {
    const source = await captureCanonicalWorkspaceBundleSource()
    const mutable = source.files[0]!.bytes
    mutable[0] = mutable[0]! ^ 0xff
    const before = await completeTree(fixture.workspace.canonicalRoot)

    const result = await materializeWorkspaceBundle({
      workspace: fixture.workspace,
      source,
    })

    assert.equal(result.status, 'source_invalid')
    assert.deepEqual(
      await completeTree(fixture.workspace.canonicalRoot),
      before,
    )
  } finally {
    await fixture.cleanup()
  }
})

test('a fabricated admitted handle cannot authorize bundle mutation', async () => {
  const fixture = await createFixture()
  try {
    const unadmittedRoot = path.join(fixture.root, 'unadmitted')
    await mkdir(unadmittedRoot)
    const fabricated: AdmittedSemesterWorkspace = {
      ...fixture.workspace,
      canonicalRoot: await realpath(unadmittedRoot),
    }
    const source = await captureCanonicalWorkspaceBundleSource()

    const result = await materializeWorkspaceBundle({
      workspace: fabricated,
      source,
    })

    assert.equal(result.status, 'unavailable')
    assert.deepEqual(await readdir(unadmittedRoot), [])
  } finally {
    await fixture.cleanup()
  }
})

function fileBytes(
  source: VerifiedBundleSource,
  relativePath: string,
): Buffer {
  const file = source.files.find(
    (candidate) => candidate.relativePath === relativePath,
  )
  assert.ok(file)
  return Buffer.from(file.bytes)
}

async function createFixture() {
  const root = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-workspace-bundle-test-'),
  )
  const canonicalRoot = await realpath(root)
  const parentStats = await lstat(canonicalRoot, { bigint: true })
  const admission = createSemesterWorkspaceAdmission()
  const inspected = await admission.inspect({
    kind: 'create',
    parent: {
      selectionId: 'selection_bundle',
      canonicalParent: canonicalRoot,
      parentDevice: String(parentStats.dev),
      parentInode: String(parentStats.ino),
    },
    semester: {
      yearLevel: 2,
      term: { key: 'spring', displayName: '1학기' },
    },
    leafName: 'workspace',
  })
  assert.equal(inspected.outcome, 'new_target')
  if (inspected.outcome !== 'new_target') {
    assert.fail('expected fresh workspace target')
  }
  const applied = await admission.apply(inspected.plan)
  assert.equal(applied.outcome, 'created')
  if (applied.outcome !== 'created') {
    assert.fail('expected admitted workspace')
  }
  const workspace = applied.workspace
  return {
    root,
    workspace,
    canonicalSourceRoot: fileURLToPath(
      new URL('../resources/workspace/', import.meta.url),
    ),
    cleanup: () => rm(root, { force: true, recursive: true }),
  }
}

async function completeTree(root: string | URL): Promise<string[]> {
  const rootPath = root instanceof URL ? fileURLToPath(root) : root
  const files: string[] = []
  await walk(rootPath, '', files)
  return files.sort()
}

async function walk(
  directory: string,
  prefix: string,
  files: string[],
): Promise<void> {
  for (const name of (await readdir(directory)).sort()) {
    const relativePath = prefix ? `${prefix}/${name}` : name
    const entry = path.join(directory, name)
    const stats = await lstat(entry)
    if (stats.isDirectory()) {
      await walk(entry, relativePath, files)
    } else {
      files.push(relativePath)
    }
  }
}

async function readEntryBytes(target: string): Promise<Buffer> {
  const stats = await lstat(target)
  if (stats.isSymbolicLink()) {
    return Buffer.from(`symlink:${await readFile(target, 'utf8')}`)
  }
  return readFile(target)
}
