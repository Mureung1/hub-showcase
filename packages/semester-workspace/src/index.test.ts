import assert from 'node:assert/strict'
import test from 'node:test'

import * as semesterWorkspace from './index.js'

test('semester workspace package exposes only the v4 identity kernel', () => {
  assert.equal(
    typeof semesterWorkspace.decodeSemesterWorkspaceStateV4Bytes,
    'function',
  )
  assert.equal(
    typeof semesterWorkspace.encodeSemesterWorkspaceStateV4,
    'function',
  )
  assert.equal(
    typeof semesterWorkspace.classifySemesterWorkspaceRootStateBytes,
    'function',
  )
  assert.equal(
    typeof semesterWorkspace.isSemesterIdentityV4,
    'function',
  )
  assert.equal(
    typeof semesterWorkspace.isWorkspaceIdV4,
    'function',
  )

  assert.deepEqual(Object.keys(semesterWorkspace).sort(), [
    'SemesterWorkspaceV4CodecError',
    'classifySemesterWorkspaceRootStateBytes',
    'createInitialSemesterWorkspaceStateV4',
    'decodeSemesterWorkspaceStateV4',
    'decodeSemesterWorkspaceStateV4Bytes',
    'encodeSemesterWorkspaceStateV4',
    'isSemesterIdentityV4',
    'isWorkspaceIdV4',
  ])
})
