import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

import {
  assembleCanonicalRuntimeManifest,
  type CanonicalRuntimeManifestAssemblyInput,
  type RuntimeRecipientAssemblyEntry,
} from './canonical-runtime-manifest-assembler.js'
import {
  CanonicalRuntimeManifestContractError,
  decodeCanonicalRuntimeManifest,
} from './canonical-runtime-manifest.js'
import {
  createRuntimeResolverReleaseFixture,
} from './runtime-resolver-fixture.test.js'

const PROVENANCE_BYTES = Buffer.from(
  JSON.stringify(
    {
      builder: {
        identity: 'git:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        name: 'ay-ple-synthetic-runtime-builder',
        version: '0.0.0-synthetic',
      },
      inputs: [
        {
          name: 'synthetic-python-archive',
          sha256: '4'.repeat(64),
          version: '3.10.18',
        },
      ],
      sources: [
        {
          name: 'openai-codex',
          revision: '8c68d4c87dc54d38861f5114e920c3de2efa5876',
        },
      ],
    },
    null,
    2,
  ) + '\n',
)

const ENTRIES: readonly RuntimeRecipientAssemblyEntry[] = [
  file('NOTICE', 'Synthetic Runtime notice.\n'),
  file('THIRD_PARTY_NOTICES.md', '# Synthetic notices\n'),
  file('bundle/bridge/worker.py', 'print("bridge")\n'),
  file('bundle/python/bin/python3.10', '#!/bin/sh\nexit 0\n', '100755'),
  {
    path: 'bundle/python/bin/python3',
    target: 'python3.10',
    type: 'symlink',
  },
  file(
    'bundle/site-packages/codex_cli_bin/bin/codex',
    '#!/bin/sh\nexit 0\n',
    '100755',
  ),
  file('licenses/openai/LICENSE', 'Synthetic Apache-2.0 fixture.\n'),
  {
    bytes: PROVENANCE_BYTES.byteLength,
    mode: '100644',
    path: 'provenance/inputs.json',
    sha256: createHash('sha256').update(PROVENANCE_BYTES).digest('hex'),
    type: 'file',
  },
  file('sbom.spdx.json', '{"spdxVersion":"SPDX-2.3"}\n'),
]

const INPUT: CanonicalRuntimeManifestAssemblyInput = {
  entries: ENTRIES,
  identity: {
    native_codex_version: '0.144.4',
    python_version: '3.10.18',
    source_commit: '8c68d4c87dc54d38861f5114e920c3de2efa5876',
    patch_stack_sha256:
      'ffc43da6e5e7a146016404db54968d37d849b778e5e9b04db680cac4124fc1c9',
  },
  inputProvenancePath: 'provenance/inputs.json',
  launch: {
    python_executable: 'bundle/python/bin/python3.10',
    bridge_entrypoint: 'bundle/bridge/worker.py',
    site_packages: 'bundle/site-packages',
    native_executable:
      'bundle/site-packages/codex_cli_bin/bin/codex',
  },
  runtimeContractVersion: 1,
}

test('assembles one decoder-accepted canonical manifest from order-independent recipient input', () => {
  const inputSnapshot = structuredClone(INPUT)
  const first = assembleCanonicalRuntimeManifest(INPUT)
  const second = assembleCanonicalRuntimeManifest({
    ...INPUT,
    entries: [...ENTRIES].reverse(),
  })

  assert.deepEqual(first.canonicalManifestBytes, second.canonicalManifestBytes)
  assert.deepEqual(INPUT, inputSnapshot)
  assert.deepEqual(
    decodeCanonicalRuntimeManifest(
      JSON.parse(first.canonicalManifestBytes.toString('utf8')) as unknown,
    ),
    first.manifest,
  )
  assert.equal(
    first.manifestSha256,
    createHash('sha256')
      .update(first.canonicalManifestBytes)
      .digest('hex'),
  )
  assert.deepEqual(first.manifest.payload.entries, [
    ...first.manifest.payload.entries,
  ].sort((left, right) => compareUnicodeCodePoints(left.path, right.path)))
  assert.equal(
    first.manifest.bundle.file_count,
    first.manifest.payload.entries.filter(
      (entry) => entry.type === 'file' && entry.path.startsWith('bundle/'),
    ).length,
  )
  assert.equal(
    first.manifest.input_provenance.sha256,
    createHash('sha256').update(PROVENANCE_BYTES).digest('hex'),
  )
})

test('keeps detailed build inputs inside the referenced provenance payload', () => {
  const assembled = assembleCanonicalRuntimeManifest(INPUT)
  const encoded = JSON.parse(
    assembled.canonicalManifestBytes.toString('utf8'),
  ) as Record<string, unknown>

  assert.deepEqual(Object.keys(encoded.input_provenance as object).sort(), [
    'path',
    'sha256',
  ])
  assert.equal(
    assembled.manifest.payload.entries.some(
      (entry) => entry.path === 'downloads/python.tar.gz',
    ),
    false,
  )
  assert.equal(
    assembled.manifest.payload.entries.some(
      (entry) => entry.path === 'source/openai-codex',
    ),
    false,
  )
})

test('uses the existing canonical decoder as the only strict contract authority', async (t) => {
  const cases: Array<{
    expected: RegExp
    input: CanonicalRuntimeManifestAssemblyInput
    name: string
  }> = [
    {
      name: 'missing required top-level file',
      input: {
        ...INPUT,
        entries: ENTRIES.filter((entry) => entry.path !== 'NOTICE'),
      },
      expected: /canonical Runtime manifest/i,
    },
    {
      name: 'escaping symlink',
      input: {
        ...INPUT,
        entries: ENTRIES.map((entry) =>
          entry.type === 'symlink'
            ? { ...entry, target: '../../../../outside' }
            : entry,
        ),
      },
      expected: /canonical Runtime manifest/i,
    },
    {
      name: 'non-executable selected Runtime',
      input: {
        ...INPUT,
        entries: ENTRIES.map((entry) =>
          entry.path === INPUT.launch.native_executable &&
          entry.type === 'file'
            ? { ...entry, mode: '100644' }
            : entry,
        ),
      },
      expected: /canonical Runtime manifest/i,
    },
    {
      name: 'provenance reference is not a recipient file',
      input: {
        ...INPUT,
        inputProvenancePath: 'provenance/missing.json',
      },
      expected: /canonical Runtime manifest/i,
    },
  ]

  for (const row of cases) {
    await t.test(row.name, () => {
      assert.throws(
        () => assembleCanonicalRuntimeManifest(row.input),
        (error: unknown) =>
          error instanceof CanonicalRuntimeManifestContractError &&
          row.expected.test(error.message),
      )
    })
  }
})

test('pins the canonical synthetic R2 resolver fixture bytes for R2b handoff', async () => {
  const fixture = await createRuntimeResolverReleaseFixture()

  assert.equal(fixture.canonicalManifestBytes.byteLength, 3093)
  assert.equal(
    createHash('sha256')
      .update(fixture.canonicalManifestBytes)
      .digest('hex'),
    'd2d09adeb6adc7d456b4418f30e68d285c87d7092abb864e27338541dd655421',
  )
  assert.deepEqual(fixture.canonicalManifest, fixture.admission.manifest)
})

function file(
  path: string,
  contents: string,
  mode: '100644' | '100755' = '100644',
): RuntimeRecipientAssemblyEntry {
  return {
    bytes: Buffer.byteLength(contents),
    mode,
    path,
    sha256: createHash('sha256').update(contents).digest('hex'),
    type: 'file',
  }
}

function compareUnicodeCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left, (character) => character.codePointAt(0)!)
  const rightPoints = Array.from(
    right,
    (character) => character.codePointAt(0)!,
  )
  const length = Math.min(leftPoints.length, rightPoints.length)
  for (let index = 0; index < length; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) {
      return leftPoints[index] - rightPoints[index]
    }
  }
  return leftPoints.length - rightPoints.length
}
