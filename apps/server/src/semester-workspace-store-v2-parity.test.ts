import assert from 'node:assert/strict'
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  createLegacyV2ParityVectors,
  legacyV2ParityVectorCounts,
} from '@ay-ple/semester-workspace/testing/legacy-v2-parity-vectors'

import { semesterWorkspaceStore } from './semester-workspace-store.js'

test('Server open preserves bytes while matching the fixed package-owned current-v2 outcomes', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ay-ple-server-v2-parity-'))
  const productRoot = path.join(root, '.ay-ple')
  const statePath = path.join(productRoot, 'workspace-state.json')
  const sentinelPath = path.join(productRoot, 'student-private.bin')
  const sentinelBytes = Buffer.from('preserve unknown entry', 'utf8')
  const vectors = createLegacyV2ParityVectors()

  try {
    await mkdir(productRoot)
    await writeFile(sentinelPath, sentinelBytes)

    assert.equal(vectors.length, legacyV2ParityVectorCounts.total)
    for (const vector of vectors) {
      await writeFile(statePath, vector.bytes)
      const before = await readFile(statePath)
      const result = await semesterWorkspaceStore.open(root)
      const label = `${vector.family}: ${vector.label}`

      assert.equal(
        result.status,
        vector.expected,
        label,
      )
      if (result.status === 'ready') {
        assert.equal(result.created, false, label)
        assert.deepEqual(
          result.store,
          JSON.parse(
            new TextDecoder('utf-8', { fatal: true }).decode(vector.bytes),
          ),
          label,
        )
        assert.deepEqual(result.authority.bytes, vector.bytes, label)
      } else {
        assert.equal(result.foundStoreFormatVersion, 2, label)
      }
      assert.deepEqual(await readFile(statePath), before, label)
      assert.deepEqual(await readFile(sentinelPath), sentinelBytes, label)
    }
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})
