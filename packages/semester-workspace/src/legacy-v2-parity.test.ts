import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { semesterWorkspaceStore } from '../../../apps/server/src/semester-workspace-store.js'
import { createSemesterWorkspaceAdmission } from './admission.js'
import { classifySemesterWorkspaceStateBytes } from './v3-codec.js'

test('the package classifier matches the donor for a decoder-valid v2 store over one MiB', async () => {
  const materials = Array.from({ length: 7_500 }, (_, index) => ({
    id: `material_${index.toString(16).padStart(32, '0')}`,
    relativePath: `source-${index.toString().padStart(5, '0')}.txt`,
    digest: index.toString(16).padStart(64, '0'),
    mediaType: 'text/plain; charset=utf-8',
    size: 0,
  }))
  const bytes = Buffer.from(
    JSON.stringify({
      formatVersion: 2,
      workspaceId: `workspace_${'a'.repeat(32)}`,
      confirmedRevision: 0,
      course: {
        id: `course_${'b'.repeat(32)}`,
        displayName: '대용량 호환성 확인',
      },
      materials,
      assignments: [],
      statePatches: [],
      userConfirmations: [],
      modelingRuns: [],
      executionGuard: null,
      sourceRecovery: null,
    }),
    'utf8',
  )
  assert.ok(bytes.byteLength > 1024 * 1024)

  assert.equal(await donorAccepts(bytes), true)
  assert.deepEqual(classifySemesterWorkspaceStateBytes(bytes), {
    status: 'legacy_v2',
  })
  assert.deepEqual(await packageInspection(bytes), {
    outcome: 'legacy_migration_required',
    readOnly: true,
  })
})

test('the package classifier matches fieldwise donor semantics for reordered retry source objects', async () => {
  const firstMaterialId = `material_${'1'.repeat(32)}`
  const secondMaterialId = `material_${'2'.repeat(32)}`
  const firstDigest = '3'.repeat(64)
  const secondDigest = '4'.repeat(64)
  const baseRun = {
    courseId: `course_${'b'.repeat(32)}`,
    invocationFingerprint: '5'.repeat(64),
    requestedSkillName: 'ay-ple-first-assignment',
    requestedSkillPath: '/private/ay-ple/skill/SKILL.md',
    recipeName: '첫 과제',
    recipeVersion: '1',
    recipeDigest: '6'.repeat(64),
    argumentsDigest: '7'.repeat(64),
  }
  const bytes = Buffer.from(
    JSON.stringify({
      sourceRecovery: null,
      executionGuard: null,
      modelingRuns: [
        {
          id: `run_${'8'.repeat(32)}`,
          actionId: `action_${'9'.repeat(32)}`,
          ...baseRun,
          sourceBaseline: [
            { rawMaterialId: firstMaterialId, digest: firstDigest },
            { rawMaterialId: secondMaterialId, digest: secondDigest },
          ],
          status: 'interrupted',
          validationOutcome: 'unknown',
          recoveryOutcome: { outcome: 'interrupted' },
          createdAt: '2026-07-23T00:00:00.000Z',
          updatedAt: '2026-07-23T00:00:01.000Z',
          settledAt: '2026-07-23T00:00:01.000Z',
        },
        {
          id: `run_${'a'.repeat(32)}`,
          actionId: `action_${'b'.repeat(32)}`,
          ...baseRun,
          sourceBaseline: [
            { digest: firstDigest, rawMaterialId: firstMaterialId },
            { digest: secondDigest, rawMaterialId: secondMaterialId },
          ],
          retryOfRunId: `run_${'8'.repeat(32)}`,
          status: 'completed',
          validationOutcome: 'passed',
          createdAt: '2026-07-23T00:00:02.000Z',
          updatedAt: '2026-07-23T00:00:03.000Z',
          settledAt: '2026-07-23T00:00:03.000Z',
        },
      ],
      userConfirmations: [],
      statePatches: [],
      assignments: [],
      materials: [
        {
          size: 0,
          mediaType: 'text/plain; charset=utf-8',
          digest: firstDigest,
          relativePath: 'first.txt',
          id: firstMaterialId,
        },
        {
          size: 0,
          mediaType: 'text/plain; charset=utf-8',
          digest: secondDigest,
          relativePath: 'second.txt',
          id: secondMaterialId,
        },
      ],
      course: {
        displayName: '직렬화 순서 호환성',
        id: baseRun.courseId,
      },
      confirmedRevision: 0,
      workspaceId: `workspace_${'c'.repeat(32)}`,
      formatVersion: 2,
    }),
    'utf8',
  )

  assert.equal(await donorAccepts(bytes), true)
  assert.deepEqual(classifySemesterWorkspaceStateBytes(bytes), {
    status: 'legacy_v2',
  })
})

async function donorAccepts(bytes: Buffer): Promise<boolean> {
  const root = await mkdtemp(path.join(tmpdir(), 'ay-ple-v2-parity-'))
  try {
    const productRoot = path.join(root, '.ay-ple')
    await mkdir(productRoot)
    await writeFile(path.join(productRoot, 'workspace-state.json'), bytes)
    return (await semesterWorkspaceStore.open(root)).status === 'ready'
  } finally {
    await rm(root, { force: true, recursive: true })
  }
}

async function packageInspection(bytes: Buffer) {
  const root = await mkdtemp(path.join(tmpdir(), 'ay-ple-v2-package-'))
  try {
    const productRoot = path.join(root, '.ay-ple')
    await mkdir(productRoot)
    await writeFile(path.join(productRoot, 'workspace-state.json'), bytes)
    return createSemesterWorkspaceAdmission().inspect({
      kind: 'reopen',
      canonicalRoot: await import('node:fs/promises').then(({ realpath }) =>
        realpath(root),
      ),
    })
  } finally {
    await rm(root, { force: true, recursive: true })
  }
}
