/// <reference types="node" />

import type {
  SemesterIdentity,
  SemesterWorkspaceV3,
} from './contract.js'
import {
  decodeCurrentSemesterWorkspaceV2,
  SemesterWorkspaceV2CodecError,
} from './legacy-v2-codec.js'

const workspaceStateMaxBytes = 1024 * 1024
const meaningfulTextMaxBytes = 512

export class SemesterWorkspaceCodecError extends TypeError {
  constructor() {
    super('The SemesterWorkspace v3 aggregate is invalid.')
    this.name = 'SemesterWorkspaceCodecError'
  }
}

export type SemesterWorkspaceStateClassification =
  | {
      readonly status: 'current_v3'
      readonly aggregate: SemesterWorkspaceV3
    }
  | { readonly status: 'legacy_v2' }
  | { readonly status: 'incompatible' }

export function classifySemesterWorkspaceStateBytes(
  bytes: Uint8Array,
): SemesterWorkspaceStateClassification {
  let value: unknown
  try {
    value = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    )
  } catch {
    return { status: 'incompatible' }
  }
  if (bytes.byteLength <= workspaceStateMaxBytes) {
    try {
      return {
        status: 'current_v3',
        aggregate: decodeSemesterWorkspaceV3(value),
      }
    } catch (error) {
      if (!(error instanceof SemesterWorkspaceCodecError)) throw error
    }
  }
  try {
    decodeCurrentSemesterWorkspaceV2(value)
    return { status: 'legacy_v2' }
  } catch (error) {
    if (error instanceof SemesterWorkspaceV2CodecError) {
      return { status: 'incompatible' }
    }
    throw error
  }
}

export function createInitialSemesterWorkspaceV3(input: {
  readonly workspaceId: string
  readonly semester: SemesterIdentity
}): SemesterWorkspaceV3 {
  return decodeSemesterWorkspaceV3({
    kind: 'ay-ple.semester-workspace',
    formatVersion: 3,
    manifest: {
      workspaceId: input.workspaceId,
      semester: input.semester,
      courses: [],
    },
    state: {
      settings: {},
      confirmedRevision: 0,
      materials: [],
      assignments: [],
      statePatches: [],
      userConfirmations: [],
      modelingRuns: [],
      executionGuard: null,
      sourceRecovery: null,
    },
  })
}

export function encodeSemesterWorkspaceV3(
  aggregate: SemesterWorkspaceV3,
): Buffer {
  return Buffer.from(
    `${JSON.stringify(decodeSemesterWorkspaceV3(aggregate), null, 2)}\n`,
    'utf8',
  )
}

export function decodeSemesterWorkspaceV3Bytes(
  bytes: Uint8Array,
): SemesterWorkspaceV3 {
  if (bytes.byteLength > workspaceStateMaxBytes) throw invalidAggregate()
  try {
    return decodeSemesterWorkspaceV3(
      JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)),
    )
  } catch (error) {
    if (error instanceof SemesterWorkspaceCodecError) throw error
    throw invalidAggregate()
  }
}

export function decodeSemesterWorkspaceV3(
  value: unknown,
): SemesterWorkspaceV3 {
  if (
    !isExactObject(value, ['formatVersion', 'kind', 'manifest', 'state']) ||
    value.kind !== 'ay-ple.semester-workspace' ||
    value.formatVersion !== 3 ||
    !isExactObject(value.manifest, ['courses', 'semester', 'workspaceId']) ||
    !isWorkspaceId(value.manifest.workspaceId) ||
    !isSemesterIdentity(value.manifest.semester) ||
    !isExactEmptyArray(value.manifest.courses) ||
    !isExactObject(value.state, [
      'assignments',
      'confirmedRevision',
      'executionGuard',
      'materials',
      'modelingRuns',
      'settings',
      'sourceRecovery',
      'statePatches',
      'userConfirmations',
    ]) ||
    !isExactObject(value.state.settings, []) ||
    value.state.confirmedRevision !== 0 ||
    !isExactEmptyArray(value.state.materials) ||
    !isExactEmptyArray(value.state.assignments) ||
    !isExactEmptyArray(value.state.statePatches) ||
    !isExactEmptyArray(value.state.userConfirmations) ||
    !isExactEmptyArray(value.state.modelingRuns) ||
    value.state.executionGuard !== null ||
    value.state.sourceRecovery !== null
  ) {
    throw invalidAggregate()
  }

  return {
    kind: 'ay-ple.semester-workspace',
    formatVersion: 3,
    manifest: {
      workspaceId: value.manifest.workspaceId,
      semester: cloneSemesterIdentity(value.manifest.semester),
      courses: [],
    },
    state: {
      settings: {},
      confirmedRevision: 0,
      materials: [],
      assignments: [],
      statePatches: [],
      userConfirmations: [],
      modelingRuns: [],
      executionGuard: null,
      sourceRecovery: null,
    },
  }
}

export function isSemesterIdentity(
  value: unknown,
): value is SemesterIdentity {
  return (
    isExactObject(value, ['term', 'yearLevel']) &&
    Number.isSafeInteger(value.yearLevel) &&
    Number(value.yearLevel) > 0 &&
    isExactObject(value.term, ['displayName', 'key']) &&
    isBoundedMeaningfulText(value.term.key) &&
    isBoundedMeaningfulText(value.term.displayName)
  )
}

export function isWorkspaceId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^workspace_[0-9a-f]{32}$/.test(value)
  )
}

function cloneSemesterIdentity(
  semester: SemesterIdentity,
): SemesterIdentity {
  return {
    yearLevel: semester.yearLevel,
    term: {
      key: semester.term.key,
      displayName: semester.term.displayName,
    },
  }
}

function isExactEmptyArray(value: unknown): value is readonly [] {
  return Array.isArray(value) && value.length === 0
}

function isBoundedMeaningfulText(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    Buffer.byteLength(value, 'utf8') <= meaningfulTextMaxBytes
  )
}

function isExactObject(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  )
}

function invalidAggregate(): SemesterWorkspaceCodecError {
  return new SemesterWorkspaceCodecError()
}
