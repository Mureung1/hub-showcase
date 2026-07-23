import assert from 'node:assert/strict'
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  truncate,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { createSemesterWorkspaceAdmission } from './admission.js'
import type { WorkspaceParentAuthority } from './contract.js'
import { decodeSemesterWorkspaceV3Bytes } from './v3-codec.js'

test('inspect is write-free and apply exclusively creates a fresh-decodable minimal v3 workspace', async () => {
  const parent = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-v3-admission-create-'),
  )
  try {
    const authority = await parentAuthority(parent)
    const admission = createSemesterWorkspaceAdmission()
    const before = await readdir(parent)
    const inspection = await admission.inspect({
      kind: 'create',
      parent: authority,
      semester: {
        yearLevel: 2,
        term: { key: '1', displayName: '1학기' },
      },
      leafName: '2026-1학기',
    })

    assert.equal(inspection.outcome, 'new_target')
    assert.deepEqual(await readdir(parent), before)
    if (inspection.outcome !== 'new_target') {
      assert.fail('a valid absent leaf must produce a create plan')
    }

    const applied = await admission.apply(inspection.plan)

    assert.equal(applied.outcome, 'created')
    if (applied.outcome !== 'created') {
      assert.fail('the create plan must admit the new workspace')
    }
    const root = path.join(authority.canonicalParent, '2026-1학기')
    assert.equal(applied.workspace.canonicalRoot, root)
    assert.match(applied.workspace.workspaceId, /^workspace_[0-9a-f]{32}$/)
    assert.deepEqual(await readdir(root), ['.ay-ple', 'courses', 'inbox'])
    assert.deepEqual(await readdir(path.join(root, '.ay-ple')), [
      'workspace-state.json',
    ])
    const aggregate = decodeSemesterWorkspaceV3Bytes(
      await readFile(path.join(root, '.ay-ple', 'workspace-state.json')),
    )
    assert.deepEqual(aggregate.manifest, applied.workspace.manifest)
    const studentBytes = Buffer.from('existing user content', 'utf8')
    await writeFile(path.join(root, 'student-note.txt'), studentBytes)

    const reopened = await createSemesterWorkspaceAdmission().inspect({
      kind: 'reopen',
      canonicalRoot: root,
    })
    assert.deepEqual(reopened, {
      outcome: 'admitted',
      workspace: applied.workspace,
    })
    assert.deepEqual(
      await readFile(path.join(root, 'student-note.txt')),
      studentBytes,
    )
  } finally {
    await rm(parent, { force: true, recursive: true })
  }
})

test('v2, malformed, future, unknown, symlink, and unavailable roots are inspected read-only with byte identity', async () => {
  const parent = await realpath(
    await mkdtemp(
      path.join(tmpdir(), 'ay-ple-v3-admission-compatibility-'),
    ),
  )
  const validV2 = await readFile(
    new URL(
      './testing/fixtures/current-v2-workspace.json',
      import.meta.url,
    ),
  )
  const fixtures = [
    {
      leaf: 'legacy-v2',
      bytes: validV2,
      expected: {
        outcome: 'legacy_migration_required',
        readOnly: true,
      },
    },
    {
      leaf: 'malformed',
      bytes: Buffer.from('{"formatVersion":3,\n', 'utf8'),
      expected: { outcome: 'incompatible', readOnly: true },
    },
    {
      leaf: 'future',
      bytes: Buffer.from(
        '{"kind":"ay-ple.semester-workspace","formatVersion":4,"future":"keep"}\n',
        'utf8',
      ),
      expected: { outcome: 'incompatible', readOnly: true },
    },
  ] as const

  try {
    for (const fixture of fixtures) {
      const root = path.join(parent, fixture.leaf)
      const productRoot = path.join(root, '.ay-ple')
      const statePath = path.join(productRoot, 'workspace-state.json')
      const unknownRootPath = path.join(root, 'student-note.txt')
      const unknownProductPath = path.join(productRoot, 'student-private.bin')
      await mkdir(productRoot, { recursive: true })
      await writeFile(statePath, fixture.bytes)
      await writeFile(unknownRootPath, 'root sentinel', 'utf8')
      await writeFile(unknownProductPath, 'product sentinel', 'utf8')

      const beforeEntries = {
        root: (await readdir(root)).sort(),
        product: (await readdir(productRoot)).sort(),
      }
      const admission = createSemesterWorkspaceAdmission()
      assert.deepEqual(
        await admission.inspect({ kind: 'reopen', canonicalRoot: root }),
        fixture.expected,
        fixture.leaf,
      )
      assert.deepEqual(await readFile(statePath), fixture.bytes, fixture.leaf)
      assert.equal(
        await readFile(unknownRootPath, 'utf8'),
        'root sentinel',
        fixture.leaf,
      )
      assert.equal(
        await readFile(unknownProductPath, 'utf8'),
        'product sentinel',
        fixture.leaf,
      )
      assert.deepEqual(
        {
          root: (await readdir(root)).sort(),
          product: (await readdir(productRoot)).sort(),
        },
        beforeEntries,
        fixture.leaf,
      )
    }

    const symlinkRoot = path.join(parent, 'symlink-state')
    const symlinkProduct = path.join(symlinkRoot, '.ay-ple')
    const externalState = path.join(parent, 'external-state.json')
    const externalBytes = Buffer.from('external state bytes', 'utf8')
    await mkdir(symlinkProduct, { recursive: true })
    await writeFile(externalState, externalBytes)
    await symlink(
      externalState,
      path.join(symlinkProduct, 'workspace-state.json'),
    )
    assert.deepEqual(
      await createSemesterWorkspaceAdmission().inspect({
        kind: 'reopen',
        canonicalRoot: symlinkRoot,
      }),
      { outcome: 'unsafe', readOnly: false },
    )
    assert.deepEqual(await readFile(externalState), externalBytes)

    const oversizedRoot = path.join(parent, 'oversized')
    const oversizedProduct = path.join(oversizedRoot, '.ay-ple')
    const oversizedState = path.join(
      oversizedProduct,
      'workspace-state.json',
    )
    const oversizedPrefix = Buffer.from('preserve sparse prefix', 'utf8')
    await mkdir(oversizedProduct, { recursive: true })
    await writeFile(oversizedState, oversizedPrefix)
    await truncate(oversizedState, 2 ** 31)
    assert.deepEqual(
      await createSemesterWorkspaceAdmission().inspect({
        kind: 'reopen',
        canonicalRoot: oversizedRoot,
      }),
      { outcome: 'incompatible', readOnly: true },
    )
    const oversizedHandle = await open(oversizedState, 'r')
    try {
      const preserved = Buffer.alloc(oversizedPrefix.byteLength)
      await oversizedHandle.read(preserved, 0, preserved.byteLength, 0)
      assert.deepEqual(preserved, oversizedPrefix)
    } finally {
      await oversizedHandle.close()
    }

    const unavailableRoot = path.join(parent, 'unavailable')
    const unavailableProduct = path.join(unavailableRoot, '.ay-ple')
    await mkdir(unavailableProduct, { recursive: true })
    await writeFile(
      path.join(unavailableProduct, 'workspace-state.json'),
      validV2,
    )
    await chmod(unavailableProduct, 0)
    try {
      assert.deepEqual(
        await createSemesterWorkspaceAdmission().inspect({
          kind: 'reopen',
          canonicalRoot: unavailableRoot,
        }),
        { outcome: 'unavailable', readOnly: false },
      )
    } finally {
      await chmod(unavailableProduct, 0o700)
    }
  } finally {
    await rm(parent, { force: true, recursive: true })
  }
})

test('create inspection rejects unsafe identity and only an unchanged absent one-segment leaf can apply', async () => {
  const parent = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-v3-admission-exclusive-'),
  )
  try {
    const authority = await parentAuthority(parent)
    const admission = createSemesterWorkspaceAdmission()
    const base = {
      kind: 'create' as const,
      parent: authority,
      semester: {
        yearLevel: 2,
        term: { key: 'custom', displayName: '교환학기' },
      },
      leafName: 'exchange-2026',
    }
    const invalid = [
      { ...base, semester: { ...base.semester, yearLevel: 0 } },
      {
        ...base,
        semester: {
          ...base.semester,
          term: { key: '', displayName: '교환학기' },
        },
      },
      { ...base, leafName: '../escape' },
      { ...base, leafName: 'nested/leaf' },
      { ...base, leafName: 'x'.repeat(256) },
      {
        ...base,
        parent: { ...authority, parentInode: '999999999999999999' },
      },
    ]
    for (const intent of invalid) {
      assert.deepEqual(await admission.inspect(intent), {
        outcome: 'unsafe',
        readOnly: false,
      })
    }
    assert.deepEqual(await readdir(parent), [])

    const emptyRoot = path.join(parent, 'existing-empty')
    await mkdir(emptyRoot)
    assert.deepEqual(
      await admission.inspect({ ...base, leafName: 'existing-empty' }),
      { outcome: 'collision', readOnly: false },
    )
    assert.deepEqual(await readdir(emptyRoot), [])

    const linkedRoot = path.join(parent, 'linked-root')
    await symlink(emptyRoot, linkedRoot)
    assert.deepEqual(
      await admission.inspect({ ...base, leafName: 'linked-root' }),
      { outcome: 'unsafe', readOnly: false },
    )

    const planned = await admission.inspect(base)
    assert.equal(planned.outcome, 'new_target')
    if (planned.outcome !== 'new_target') assert.fail('plan required')
    const racedRoot = path.join(parent, base.leafName)
    await mkdir(racedRoot)
    const sentinel = path.join(racedRoot, 'student-note.txt')
    await writeFile(sentinel, 'preserve me', 'utf8')
    assert.deepEqual(await admission.apply(planned.plan), {
      outcome: 'authority_changed',
    })
    assert.equal(await readFile(sentinel, 'utf8'), 'preserve me')

    const second = await admission.inspect({
      ...base,
      leafName: 'tamper-check',
    })
    assert.equal(second.outcome, 'new_target')
    if (second.outcome !== 'new_target') assert.fail('plan required')
    assert.deepEqual(
      await admission.apply({
        ...second.plan,
        authorityDigest: '0'.repeat(64),
      }),
      { outcome: 'authority_changed' },
    )
    await assert.rejects(lstat(path.join(parent, 'tamper-check')), {
      code: 'ENOENT',
    })

    const permissionPlan = await admission.inspect({
      ...base,
      leafName: 'permission-check',
    })
    assert.equal(permissionPlan.outcome, 'new_target')
    if (permissionPlan.outcome !== 'new_target') assert.fail('plan required')
    await chmod(authority.canonicalParent, 0o500)
    try {
      assert.deepEqual(await admission.apply(permissionPlan.plan), {
        outcome: 'unavailable',
      })
    } finally {
      await chmod(authority.canonicalParent, 0o700)
    }
    await assert.rejects(lstat(path.join(parent, 'permission-check')), {
      code: 'ENOENT',
    })
  } finally {
    await rm(parent, { force: true, recursive: true })
  }
})

async function parentAuthority(
  directory: string,
): Promise<WorkspaceParentAuthority> {
  const canonicalParent = await realpath(directory)
  const stats = await lstat(canonicalParent, { bigint: true })
  return {
    selectionId: 'parent_selection_test',
    canonicalParent,
    parentDevice: stats.dev.toString(),
    parentInode: stats.ino.toString(),
  }
}
