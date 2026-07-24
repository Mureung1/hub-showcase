/// <reference types="node" />

import { createHash } from 'node:crypto'

import {
  decodeCanonicalRuntimeManifest,
  runtimeManifestRosterSha256,
} from './canonical-runtime-manifest.js'
import type {
  CanonicalRuntimeManifest,
  RuntimeManifestEntry,
  RuntimeManifestFileEntry,
} from './canonical-runtime-manifest.js'

export type RuntimeRecipientAssemblyEntry = RuntimeManifestEntry

export type CanonicalRuntimeManifestAssemblyInput = {
  readonly entries: readonly RuntimeRecipientAssemblyEntry[]
  readonly identity: CanonicalRuntimeManifest['identity']
  readonly inputProvenancePath: string
  readonly launch: CanonicalRuntimeManifest['launch']
  readonly runtimeContractVersion: number
}

export type CanonicalRuntimeManifestAssembly = {
  readonly canonicalManifestBytes: Buffer
  readonly manifest: CanonicalRuntimeManifest
  readonly manifestSha256: string
}

/**
 * Adapts Runtime-owned recipient bytes into the one S1 manifest contract.
 * Filesystem capture and extracted-tree verification remain outside this
 * pure function; the existing decoder is the only schema authority.
 */
export function assembleCanonicalRuntimeManifest(
  input: CanonicalRuntimeManifestAssemblyInput,
): CanonicalRuntimeManifestAssembly {
  const entries = [...input.entries]
    .sort((left, right) =>
      compareUnicodeCodePoints(left.path, right.path),
    )
    .map(cloneManifestEntry)
  const payload = treeEvidence(entries)
  const bundle = treeEvidence(
    entries.filter((entry) => entry.path.startsWith('bundle/')),
  )
  const provenance = entries.find(
    (entry) => entry.path === input.inputProvenancePath,
  )
  const candidate = {
    schema_version: 2,
    kind: 'ay_ple_runtime_release',
    runtime_contract_version: input.runtimeContractVersion,
    target: {
      system: 'Darwin',
      architecture: 'arm64',
      id: 'darwin-arm64',
    },
    identity: { ...input.identity },
    launch: { ...input.launch },
    payload,
    bundle: {
      path: 'bundle',
      file_count: bundle.file_count,
      regular_file_bytes: bundle.regular_file_bytes,
      roster_sha256: bundle.roster_sha256,
      symlink_count: bundle.symlink_count,
    },
    input_provenance: {
      path: input.inputProvenancePath,
      sha256: provenance?.type === 'file' ? provenance.sha256 : '',
    },
  }
  const decoded = decodeCanonicalRuntimeManifest(candidate)
  const canonicalManifestBytes = canonicalJson(decoded)
  const manifest = decodeCanonicalRuntimeManifest(
    JSON.parse(canonicalManifestBytes.toString('utf8')) as unknown,
  )

  return {
    canonicalManifestBytes,
    manifest,
    manifestSha256: sha256(canonicalManifestBytes),
  }
}

function cloneManifestEntry(
  entry: RuntimeRecipientAssemblyEntry,
): RuntimeManifestEntry {
  if (entry.type === 'symlink') {
    return {
      path: entry.path,
      target: entry.target,
      type: 'symlink',
    }
  }
  return {
    bytes: entry.bytes,
    mode: entry.mode,
    path: entry.path,
    sha256: entry.sha256,
    type: 'file',
  }
}

function treeEvidence(
  entries: readonly RuntimeManifestEntry[],
): CanonicalRuntimeManifest['payload'] {
  const files = entries.filter(
    (entry): entry is RuntimeManifestFileEntry =>
      entry.type === 'file',
  )
  return {
    entries,
    file_count: files.length,
    regular_file_bytes: files.reduce(
      (total, entry) => total + entry.bytes,
      0,
    ),
    roster_sha256: runtimeManifestRosterSha256(entries),
    symlink_count: entries.length - files.length,
  }
}

function canonicalJson(value: unknown): Buffer {
  return Buffer.from(
    `${JSON.stringify(sortJsonKeys(value), null, 2)}\n`,
    'utf8',
  )
}

function sortJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonKeys)
  if (!isJsonObject(value)) return value
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) =>
        compareUnicodeCodePoints(left, right),
      )
      .map(([key, child]) => [key, sortJsonKeys(child)]),
  )
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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

function sha256(value: Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}
