import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  SemesterWorkspaceV4CodecError,
  classifySemesterWorkspaceRootStateBytes,
  createInitialSemesterWorkspaceStateV4,
  decodeSemesterWorkspaceStateV4,
  decodeSemesterWorkspaceStateV4Bytes,
  encodeSemesterWorkspaceStateV4,
} from './v4-codec.js'

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

test('the root classifier identifies legacy envelopes without decoding their academic payload', () => {
  const v4Bytes = encodeSemesterWorkspaceStateV4(
    createInitialSemesterWorkspaceStateV4({
      workspaceId,
      semester: {
        yearLevel: 2,
        term: { key: 'fall', displayName: '2학기' },
      },
    }),
  )
  const v2Bytes = Buffer.from(
    JSON.stringify({
      formatVersion: 2,
      preserve: { arbitrary: ['legacy', 'payload'] },
    }),
    'utf8',
  )
  const v3Bytes = Buffer.from(
    JSON.stringify({
      kind: 'ay-ple.semester-workspace',
      formatVersion: 3,
      preserve: { arbitrary: ['historical', 'payload'] },
    }),
    'utf8',
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
  assert.deepEqual(Buffer.from(v2Bytes), v2Bytes)
  assert.deepEqual(Buffer.from(v3Bytes), v3Bytes)
})

test('classification preserves valid v4, legacy, malformed, and future files byte-for-byte', async () => {
  const root = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-v4-classification-'),
  )
  const fixtures = [
    encodeSemesterWorkspaceStateV4(
      createInitialSemesterWorkspaceStateV4({
        workspaceId,
        semester: {
          yearLevel: 2,
          term: { key: 'fall', displayName: '2학기' },
        },
      }),
    ),
    Buffer.from('{"formatVersion":2,"legacy":true}\n', 'utf8'),
    Buffer.from(
      '{"kind":"ay-ple.semester-workspace","formatVersion":3,"legacy":true}\n',
      'utf8',
    ),
    Buffer.from('{"formatVersion":4,', 'utf8'),
    Buffer.from(
      '{"kind":"ay-ple.semester-workspace","formatVersion":5,"future":true}\n',
      'utf8',
    ),
  ]

  try {
    for (const [index, bytes] of fixtures.entries()) {
      const file = path.join(root, `workspace-state-${index}.json`)
      await writeFile(file, bytes)
      const opened = await readFile(file)
      classifySemesterWorkspaceRootStateBytes(opened)
      assert.deepEqual(await readFile(file), bytes)
    }
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('malformed, future, and oversized root bytes are incompatible', () => {
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
    Buffer.alloc(1024 * 1024 + 1, 0x20),
  ]) {
    const before = Buffer.from(bytes)
    assert.deepEqual(classifySemesterWorkspaceRootStateBytes(bytes), {
      status: 'incompatible',
    })
    assert.deepEqual(Buffer.from(bytes), before)
  }
})
