import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  SemesterWorkspaceV4CodecError,
  classifySemesterWorkspaceRootStateBytes,
  createInitialSemesterWorkspaceStateV4,
  decodeSemesterWorkspaceStateV4,
  decodeSemesterWorkspaceStateV4Bytes,
  encodeSemesterWorkspaceStateV4,
} from './v4-codec.js'
import {
  createInitialSemesterWorkspaceV3,
  encodeSemesterWorkspaceV3,
} from './v3-codec.js'

const workspaceId = 'workspace_0123456789abcdef0123456789abcdef'

test('the v4 codec emits the exact initial identity and preserves an opaque JSON snapshot', () => {
  const initial = createInitialSemesterWorkspaceStateV4({
    workspaceId,
    semester: {
      yearLevel: 2,
      term: {
        key: 'fall-2026',
        displayName: '2026년 2학기',
      },
    },
  })

  assert.deepEqual(initial.snapshot, {})
  assert.equal(
    encodeSemesterWorkspaceStateV4(initial).toString('utf8'),
    `{
  "kind": "ay-ple.semester-workspace",
  "formatVersion": 4,
  "workspaceId": "workspace_0123456789abcdef0123456789abcdef",
  "semester": {
    "yearLevel": 2,
    "term": {
      "key": "fall-2026",
      "displayName": "2026년 2학기"
    }
  },
  "snapshot": {}
}
`,
  )

  const state = decodeSemesterWorkspaceStateV4({
    ...initial,
    snapshot: {
      course: {
        title: '운영체제',
        credits: 3,
        optional: null,
        weeks: [1, true, { topic: 'processes' }],
      },
    },
  })
  assert.deepEqual(state.snapshot, {
    course: {
      title: '운영체제',
      credits: 3,
      optional: null,
      weeks: [1, true, { topic: 'processes' }],
    },
  })
})

test('the v4 codec rejects envelope, identity, JSON, and byte-bound drift', () => {
  const valid = createInitialSemesterWorkspaceStateV4({
    workspaceId,
    semester: {
      yearLevel: 20,
      term: {
        key: 'summer-intensive',
        displayName: '여름 계절학기',
      },
    },
  })
  const invalid = [
    { ...valid, extra: true },
    { ...valid, kind: 'ay-ple.other' },
    { ...valid, formatVersion: 5 },
    { ...valid, workspaceId: 'workspace_ABCDEF' },
    {
      ...valid,
      semester: { ...valid.semester, yearLevel: 0 },
    },
    {
      ...valid,
      semester: { ...valid.semester, yearLevel: 21 },
    },
    {
      ...valid,
      semester: {
        ...valid.semester,
        term: { ...valid.semester.term, key: 'Fall 2026' },
      },
    },
    {
      ...valid,
      semester: {
        ...valid.semester,
        term: { ...valid.semester.term, key: 'a'.repeat(65) },
      },
    },
    {
      ...valid,
      semester: {
        ...valid.semester,
        term: { ...valid.semester.term, displayName: '   ' },
      },
    },
    {
      ...valid,
      semester: {
        ...valid.semester,
        term: {
          ...valid.semester.term,
          displayName: '학'.repeat(43),
        },
      },
    },
    { ...valid, snapshot: [] },
    { ...valid, snapshot: { invalid: undefined } },
    { ...valid, snapshot: { invalid: Number.POSITIVE_INFINITY } },
  ]

  for (const candidate of invalid) {
    assert.throws(
      () => decodeSemesterWorkspaceStateV4(candidate),
      SemesterWorkspaceV4CodecError,
    )
  }
  assert.throws(
    () =>
      decodeSemesterWorkspaceStateV4Bytes(
        Buffer.alloc(1024 * 1024 + 1, 0x20),
      ),
    SemesterWorkspaceV4CodecError,
  )
  assert.throws(
    () =>
      decodeSemesterWorkspaceStateV4Bytes(
        Uint8Array.of(0xc3, 0x28),
      ),
    SemesterWorkspaceV4CodecError,
  )
})

test('the root classifier distinguishes v4, current v2, historical v3, and incompatible bytes without mutation', async () => {
  const v4Bytes = encodeSemesterWorkspaceStateV4(
    createInitialSemesterWorkspaceStateV4({
      workspaceId,
      semester: {
        yearLevel: 2,
        term: { key: 'fall', displayName: '2학기' },
      },
    }),
  )
  const v2Fixture = new URL(
    './testing/fixtures/current-v2-workspace.json',
    import.meta.url,
  )
  const v2Bytes = await readFile(v2Fixture)
  const v3Bytes = encodeSemesterWorkspaceV3(
    createInitialSemesterWorkspaceV3({
      workspaceId,
      semester: {
        yearLevel: 2,
        term: { key: 'fall', displayName: '2학기' },
      },
    }),
  )

  assert.equal(
    classifySemesterWorkspaceRootStateBytes(v4Bytes).status,
    'current_v4',
  )
  assert.deepEqual(classifySemesterWorkspaceRootStateBytes(v2Bytes), {
    status: 'current_v2',
  })
  assert.deepEqual(classifySemesterWorkspaceRootStateBytes(v3Bytes), {
    status: 'historical_v3',
  })
  for (const bytes of [
    Buffer.from('{"formatVersion":4,', 'utf8'),
    Buffer.from(
      JSON.stringify({
        kind: 'ay-ple.semester-workspace',
        formatVersion: 5,
        preserve: true,
      }),
      'utf8',
    ),
    Uint8Array.of(0xc3, 0x28),
  ]) {
    const before = Buffer.from(bytes)
    assert.deepEqual(classifySemesterWorkspaceRootStateBytes(bytes), {
      status: 'incompatible',
    })
    assert.deepEqual(Buffer.from(bytes), before)
  }
  assert.deepEqual(await readFile(v2Fixture), v2Bytes)
})
