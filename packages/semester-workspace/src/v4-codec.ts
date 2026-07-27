/// <reference types="node" />

import {
  decodeCurrentSemesterWorkspaceV2,
  SemesterWorkspaceV2CodecError,
} from './legacy-v2-codec.js'
import {
  decodeSemesterWorkspaceV3,
  SemesterWorkspaceCodecError,
} from './v3-codec.js'

const workspaceStateMaxBytes = 1024 * 1024
const termKeyMaxBytes = 64
const termDisplayNameMaxBytes = 128

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue }

export type SemesterWorkspaceStateV4 = {
  readonly kind: 'ay-ple.semester-workspace'
  readonly formatVersion: 4
  readonly workspaceId: string
  readonly semester: {
    readonly yearLevel: number
    readonly term: {
      readonly key: string
      readonly displayName: string
    }
  }
  readonly snapshot: Readonly<Record<string, JsonValue>>
}

export type SemesterWorkspaceRootStateClassification =
  | {
      readonly status: 'current_v4'
      readonly state: SemesterWorkspaceStateV4
    }
  | { readonly status: 'current_v2' }
  | { readonly status: 'historical_v3' }
  | { readonly status: 'incompatible' }

export class SemesterWorkspaceV4CodecError extends TypeError {
  constructor() {
    super('The SemesterWorkspace v4 state is invalid.')
    this.name = 'SemesterWorkspaceV4CodecError'
  }
}

export function createInitialSemesterWorkspaceStateV4(input: {
  readonly workspaceId: string
  readonly semester: SemesterWorkspaceStateV4['semester']
}): SemesterWorkspaceStateV4 {
  return decodeSemesterWorkspaceStateV4({
    kind: 'ay-ple.semester-workspace',
    formatVersion: 4,
    workspaceId: input.workspaceId,
    semester: input.semester,
    snapshot: {},
  })
}

export function encodeSemesterWorkspaceStateV4(
  state: SemesterWorkspaceStateV4,
): Buffer {
  const normalized = decodeSemesterWorkspaceStateV4(state)
  const bytes = Buffer.from(
    `${JSON.stringify(normalized, null, 2)}\n`,
    'utf8',
  )
  if (bytes.byteLength > workspaceStateMaxBytes) throw invalidState()
  return bytes
}

export function decodeSemesterWorkspaceStateV4Bytes(
  bytes: Uint8Array,
): SemesterWorkspaceStateV4 {
  if (
    bytes.byteLength === 0 ||
    bytes.byteLength > workspaceStateMaxBytes
  ) {
    throw invalidState()
  }
  try {
    return decodeSemesterWorkspaceStateV4(
      JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(bytes),
      ) as unknown,
    )
  } catch (error) {
    if (error instanceof SemesterWorkspaceV4CodecError) throw error
    throw invalidState()
  }
}

export function decodeSemesterWorkspaceStateV4(
  value: unknown,
): SemesterWorkspaceStateV4 {
  if (
    !isExactObject(value, [
      'formatVersion',
      'kind',
      'semester',
      'snapshot',
      'workspaceId',
    ]) ||
    value.kind !== 'ay-ple.semester-workspace' ||
    value.formatVersion !== 4 ||
    !isWorkspaceIdV4(value.workspaceId) ||
    !isSemesterIdentityV4(value.semester) ||
    !isJsonObject(value.snapshot, new Set())
  ) {
    throw invalidState()
  }

  let snapshot: Readonly<Record<string, JsonValue>>
  try {
    const serialized = JSON.stringify(value)
    if (
      serialized === undefined ||
      Buffer.byteLength(serialized, 'utf8') > workspaceStateMaxBytes
    ) {
      throw invalidState()
    }
    snapshot = (
      JSON.parse(JSON.stringify(value.snapshot)) as {
        readonly [key: string]: JsonValue
      }
    )
  } catch (error) {
    if (error instanceof SemesterWorkspaceV4CodecError) throw error
    throw invalidState()
  }

  return {
    kind: 'ay-ple.semester-workspace',
    formatVersion: 4,
    workspaceId: value.workspaceId,
    semester: {
      yearLevel: value.semester.yearLevel,
      term: {
        key: value.semester.term.key,
        displayName: value.semester.term.displayName,
      },
    },
    snapshot,
  }
}

export function classifySemesterWorkspaceRootStateBytes(
  bytes: Uint8Array,
): SemesterWorkspaceRootStateClassification {
  let value: unknown
  try {
    value = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    ) as unknown
  } catch {
    return { status: 'incompatible' }
  }

  if (bytes.byteLength <= workspaceStateMaxBytes) {
    try {
      return {
        status: 'current_v4',
        state: decodeSemesterWorkspaceStateV4(value),
      }
    } catch (error) {
      if (!(error instanceof SemesterWorkspaceV4CodecError)) throw error
    }
  }

  try {
    decodeCurrentSemesterWorkspaceV2(value)
    return { status: 'current_v2' }
  } catch (error) {
    if (!(error instanceof SemesterWorkspaceV2CodecError)) throw error
  }

  try {
    decodeSemesterWorkspaceV3(value)
    return { status: 'historical_v3' }
  } catch (error) {
    if (!(error instanceof SemesterWorkspaceCodecError)) throw error
  }

  return { status: 'incompatible' }
}

export function isWorkspaceIdV4(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^workspace_[0-9a-f]{32}$/.test(value)
  )
}

export function isSemesterIdentityV4(
  value: unknown,
): value is SemesterWorkspaceStateV4['semester'] {
  return (
    isExactObject(value, ['term', 'yearLevel']) &&
    Number.isSafeInteger(value.yearLevel) &&
    Number(value.yearLevel) >= 1 &&
    Number(value.yearLevel) <= 20 &&
    isExactObject(value.term, ['displayName', 'key']) &&
    typeof value.term.key === 'string' &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.term.key) &&
    Buffer.byteLength(value.term.key, 'utf8') <= termKeyMaxBytes &&
    typeof value.term.displayName === 'string' &&
    value.term.displayName.trim().length > 0 &&
    Buffer.byteLength(value.term.displayName, 'utf8') <=
      termDisplayNameMaxBytes
  )
}

function isJsonObject(
  value: unknown,
  ancestors: Set<object>,
): value is Readonly<Record<string, JsonValue>> {
  if (!isPlainObject(value)) return false
  if (ancestors.has(value)) return false
  ancestors.add(value)
  try {
    return Object.values(value).every((entry) =>
      isJsonValue(entry, ancestors),
    )
  } finally {
    ancestors.delete(value)
  }
}

function isJsonValue(
  value: unknown,
  ancestors: Set<object>,
): value is JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return true
  }
  if (typeof value === 'number') return Number.isFinite(value)
  if (Array.isArray(value)) {
    if (ancestors.has(value)) return false
    ancestors.add(value)
    try {
      return value.every((entry) => isJsonValue(entry, ancestors))
    } finally {
      ancestors.delete(value)
    }
  }
  return isJsonObject(value, ancestors)
}

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isExactObject(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (!isPlainObject(value)) return false
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  )
}

function invalidState(): SemesterWorkspaceV4CodecError {
  return new SemesterWorkspaceV4CodecError()
}
