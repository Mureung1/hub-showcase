import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'

import * as semesterWorkspace from './index.js'

test('semester workspace package exposes the B1a codec and admission Module', () => {
  assert.equal(
    typeof semesterWorkspace.createSemesterWorkspaceAdmission,
    'function',
  )
  assert.equal(
    typeof semesterWorkspace.createInitialSemesterWorkspaceV3,
    'function',
  )
  assert.equal(
    typeof semesterWorkspace.decodeSemesterWorkspaceV3Bytes,
    'function',
  )
  assert.equal(
    typeof semesterWorkspace.decodeCurrentSemesterWorkspaceV2,
    'function',
  )
  assert.equal(
    'createSemesterWorkspaceAdmissionForTesting' in semesterWorkspace,
    false,
  )
})

test('canonical workspace resource root contains only the S0 non-release marker', async () => {
  const resourceRoot = new URL('../resources/workspace/', import.meta.url)

  assert.deepEqual(await readdir(resourceRoot), [
    '.spine-s0-placeholder.json',
  ])
  assert.deepEqual(
    JSON.parse(
      await readFile(
        new URL('.spine-s0-placeholder.json', resourceRoot),
        'utf8',
      ),
    ),
    {
      kind: 'ay-ple.spine-s0-placeholder',
      releaseResource: false,
    },
  )
})
