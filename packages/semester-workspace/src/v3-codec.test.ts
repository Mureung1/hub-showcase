import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  SemesterWorkspaceCodecError,
  classifySemesterWorkspaceStateBytes,
  createInitialSemesterWorkspaceV3,
  decodeSemesterWorkspaceV3,
  decodeSemesterWorkspaceV3Bytes,
  encodeSemesterWorkspaceV3,
} from './v3-codec.js'

test('the v3 codec emits and fresh-decodes the exact initial aggregate', () => {
  const aggregate = createInitialSemesterWorkspaceV3({
    workspaceId: 'workspace_0123456789abcdef0123456789abcdef',
    semester: {
      yearLevel: 2,
      term: {
        key: '1',
        displayName: '1학기',
      },
    },
  })

  const bytes = encodeSemesterWorkspaceV3(aggregate)

  assert.equal(
    bytes.toString('utf8'),
    `{
  "kind": "ay-ple.semester-workspace",
  "formatVersion": 3,
  "manifest": {
    "workspaceId": "workspace_0123456789abcdef0123456789abcdef",
    "semester": {
      "yearLevel": 2,
      "term": {
        "key": "1",
        "displayName": "1학기"
      }
    },
    "courses": []
  },
  "state": {
    "settings": {},
    "confirmedRevision": 0,
    "materials": [],
    "assignments": [],
    "statePatches": [],
    "userConfirmations": [],
    "modelingRuns": [],
    "executionGuard": null,
    "sourceRecovery": null
  }
}
`,
  )
  assert.deepEqual(decodeSemesterWorkspaceV3Bytes(bytes), aggregate)
})

test('the v3 codec rejects identity, nonempty state, and extra-field drift', () => {
  const valid = createInitialSemesterWorkspaceV3({
    workspaceId: 'workspace_0123456789abcdef0123456789abcdef',
    semester: {
      yearLevel: 3,
      term: {
        key: 'summer-intensive',
        displayName: '여름 계절학기',
      },
    },
  })
  const invalid = [
    { ...valid, future: true },
    {
      ...valid,
      manifest: { ...valid.manifest, displayPath: '/private/student' },
    },
    {
      ...valid,
      manifest: {
        ...valid.manifest,
        workspaceId: 'workspace_/private/student',
      },
    },
    {
      ...valid,
      manifest: {
        ...valid.manifest,
        semester: { ...valid.manifest.semester, yearLevel: 0 },
      },
    },
    {
      ...valid,
      manifest: {
        ...valid.manifest,
        semester: {
          ...valid.manifest.semester,
          term: { key: '  ', displayName: '여름 계절학기' },
        },
      },
    },
    {
      ...valid,
      manifest: {
        ...valid.manifest,
        semester: {
          ...valid.manifest.semester,
          term: { key: 'summer', displayName: '학'.repeat(513) },
        },
      },
    },
    {
      ...valid,
      manifest: {
        ...valid.manifest,
        courses: [{ id: 'course_not-yet-defined' }],
      },
    },
    {
      ...valid,
      state: { ...valid.state, settings: { timezone: 'Asia/Seoul' } },
    },
    {
      ...valid,
      state: { ...valid.state, materials: [{}] },
    },
    {
      ...valid,
      state: { ...valid.state, confirmedRevision: 1 },
    },
  ]

  for (const candidate of invalid) {
    assert.throws(
      () => decodeSemesterWorkspaceV3(candidate),
      SemesterWorkspaceCodecError,
    )
  }
  assert.throws(
    () => decodeSemesterWorkspaceV3Bytes(Uint8Array.of(0xc3, 0x28)),
    SemesterWorkspaceCodecError,
  )
})

test('the compatibility classifier recognizes decoder-valid current v2 without rewriting bytes', async () => {
  const fixturePath = new URL(
    './testing/fixtures/current-v2-workspace.json',
    import.meta.url,
  )
  const before = await readFile(fixturePath)

  assert.deepEqual(classifySemesterWorkspaceStateBytes(before), {
    status: 'legacy_v2',
  })
  assert.deepEqual(await readFile(fixturePath), before)
})

test('the compatibility classifier rejects malformed, noncanonical v2, and future bytes', async () => {
  const valid = JSON.parse(
    await readFile(
      new URL(
        './testing/fixtures/current-v2-workspace.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as Record<string, unknown>
  const { modelingRuns: _removed, ...missingRequiredState } = valid

  for (const bytes of [
    Buffer.from('{"formatVersion":2,\n', 'utf8'),
    Buffer.from(JSON.stringify(missingRequiredState), 'utf8'),
    Buffer.from(JSON.stringify({ ...valid, resetAllowed: true }), 'utf8'),
    Buffer.from(
      JSON.stringify({
        kind: 'ay-ple.semester-workspace',
        formatVersion: 4,
        futureState: 'preserve exactly',
      }),
      'utf8',
    ),
  ]) {
    assert.deepEqual(classifySemesterWorkspaceStateBytes(bytes), {
      status: 'incompatible',
    })
  }
})
