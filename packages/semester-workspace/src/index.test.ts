import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'

import * as semesterWorkspace from './index.js'

test('semester workspace package exposes admission and bundle/context Modules', () => {
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
    typeof semesterWorkspace.captureCanonicalWorkspaceBundleSource,
    'function',
  )
  assert.equal(
    typeof semesterWorkspace.captureWorkspaceBundleSourceAt,
    'function',
  )
  assert.equal(
    typeof semesterWorkspace.materializeWorkspaceBundle,
    'function',
  )
  assert.equal(
    typeof semesterWorkspace.recoverMissingWorkspaceBundle,
    'function',
  )
  assert.equal(
    typeof semesterWorkspace.verifyWorkspaceBundle,
    'function',
  )
  assert.equal(
    typeof semesterWorkspace.createWorkspaceContextGuard,
    'function',
  )
  assert.equal(
    typeof semesterWorkspace.verifyWorkspaceStaticContext,
    'function',
  )
  assert.equal(
    typeof semesterWorkspace.createSetupEnvelopeStore,
    'function',
  )
  assert.equal(
    typeof semesterWorkspace.createSemesterSetupJourney,
    'function',
  )
  assert.equal(
    'createSemesterWorkspaceAdmissionForTesting' in semesterWorkspace,
    false,
  )
  assert.equal(
    'materializeWorkspaceBundleWithTestOptions' in semesterWorkspace,
    false,
  )
  assert.equal(
    'recoverMissingWorkspaceBundleWithTestOptions' in semesterWorkspace,
    false,
  )
})

test('root custom bundle capture is canonical-equivalent at the package resource root', async () => {
  const resourceRoot = new URL('../resources/workspace/', import.meta.url)

  assert.deepEqual(
    await semesterWorkspace.captureWorkspaceBundleSourceAt(resourceRoot),
    await semesterWorkspace.captureCanonicalWorkspaceBundleSource(),
  )
})

test('canonical workspace resource root contains no S0 placeholder', async () => {
  const resourceRoot = new URL('../resources/workspace/', import.meta.url)

  assert.deepEqual((await readdir(resourceRoot)).sort(), [
    '.agents',
    'AGENTS.md',
  ])
  assert.match(
    await readFile(new URL('AGENTS.md', resourceRoot), 'utf8'),
    /AY-PLE SemesterWorkspace/,
  )
})
