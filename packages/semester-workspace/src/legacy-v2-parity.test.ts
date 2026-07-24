import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { createSemesterWorkspaceAdmission } from './admission.js'
import {
  decodeCurrentSemesterWorkspaceV2,
  SemesterWorkspaceV2CodecError,
} from './legacy-v2-codec.js'
import {
  createLegacyV2ParityVectors,
  legacyV2ParityVectorCounts,
} from './testing/legacy-v2-parity-vectors.js'
import { classifySemesterWorkspaceStateBytes } from './v3-codec.js'

const vectors = createLegacyV2ParityVectors()

test('the package owns a fixed 426-case current-v2 compatibility roster', () => {
  const count = (family: (typeof vectors)[number]['family']) =>
    vectors.filter((vector) => vector.family === family).length

  assert.equal(vectors.length, legacyV2ParityVectorCounts.total)
  assert.equal(
    vectors.filter((vector) => vector.expected === 'ready').length,
    legacyV2ParityVectorCounts.ready,
  )
  assert.equal(
    vectors.filter((vector) => vector.expected === 'incompatible').length,
    legacyV2ParityVectorCounts.incompatible,
  )
  assert.equal(count('oversized'), legacyV2ParityVectorCounts.oversized)
  assert.equal(
    count('retry_source_order'),
    legacyV2ParityVectorCounts.retrySourceOrder,
  )
  assert.equal(
    count('guard_source_order'),
    legacyV2ParityVectorCounts.guardSourceOrder,
  )
  assert.equal(
    count('evidence_order'),
    legacyV2ParityVectorCounts.evidenceOrder,
  )
})

test('the shared decoder and classifier match every fixed package-owned current-v2 outcome', () => {
  for (const vector of vectors) {
    const parsed = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(vector.bytes),
    ) as unknown
    const label = `${vector.family}: ${vector.label}`

    if (vector.expected === 'ready') {
      assert.doesNotThrow(
        () => decodeCurrentSemesterWorkspaceV2(parsed),
        label,
      )
      assert.deepEqual(
        classifySemesterWorkspaceStateBytes(vector.bytes),
        { status: 'legacy_v2' },
        label,
      )
    } else {
      assert.throws(
        () => decodeCurrentSemesterWorkspaceV2(parsed),
        SemesterWorkspaceV2CodecError,
        label,
      )
      assert.deepEqual(
        classifySemesterWorkspaceStateBytes(vector.bytes),
        { status: 'incompatible' },
        label,
      )
    }
  }
})

test('the package admission preserves a decoder-valid current-v2 store over one MiB', async () => {
  const oversized = vectors.find((vector) => vector.family === 'oversized')
  assert.ok(oversized)
  assert.ok(oversized.bytes.byteLength > 1024 * 1024)

  assert.deepEqual(await packageInspection(oversized.bytes), {
    outcome: 'legacy_migration_required',
    readOnly: true,
  })
})

async function packageInspection(bytes: Buffer) {
  const root = await mkdtemp(path.join(tmpdir(), 'ay-ple-v2-package-'))
  try {
    const productRoot = path.join(root, '.ay-ple')
    await mkdir(productRoot)
    await writeFile(path.join(productRoot, 'workspace-state.json'), bytes)
    return await createSemesterWorkspaceAdmission().inspect({
      kind: 'reopen',
      canonicalRoot: await import('node:fs/promises').then(({ realpath }) =>
        realpath(root),
      ),
    })
  } finally {
    await rm(root, { force: true, recursive: true })
  }
}
