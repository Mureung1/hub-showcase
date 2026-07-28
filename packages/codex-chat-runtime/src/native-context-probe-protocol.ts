/// <reference types="node" />

import path from 'node:path'
import { TextDecoder } from 'node:util'

import type {
  CodexEffectiveConfig,
  CodexEffectiveSkill,
} from './native-context-contract.js'

type JsonObject = Record<string, unknown>

const SKILL_SCOPES = new Set(['user', 'repo', 'system', 'admin'])
const UTF8 = new TextDecoder('utf-8', { fatal: true })

export function decodeNativeContextInitialize(
  value: unknown,
  expectedCodexHome: string,
): void {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, [
      'codexHome',
      'userAgent',
      'platformFamily',
      'platformOs',
    ]) ||
    value.codexHome !== expectedCodexHome ||
    !isAbsoluteNormalizedPath(value.codexHome)
  ) {
    throw new Error('invalid initialize response')
  }
  for (const key of ['userAgent', 'platformFamily', 'platformOs'] as const) {
    const field = value[key]
    if (!isBoundedString(field, 1024, false)) {
      throw new Error('invalid initialize response')
    }
  }
}

export function decodeNativeContextConfig(
  value: unknown,
): CodexEffectiveConfig {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['config', 'layers', 'origins']) ||
    !isJsonObject(value.config) ||
    !Array.isArray(value.layers) ||
    !isJsonObject(value.origins)
  ) {
    throw new Error('invalid config/read response')
  }
  const config = value.config
  const rawProjectRootMarkers = config.project_root_markers
  if (
    !Object.hasOwn(config, 'project_root_markers') ||
    !Object.hasOwn(config, 'model_instructions_file') ||
    (rawProjectRootMarkers !== null &&
      (!Array.isArray(rawProjectRootMarkers) ||
        rawProjectRootMarkers.length > 1024))
  ) {
    throw new Error('invalid config/read response')
  }
  const projectRootMarkers: string[] =
    rawProjectRootMarkers === null ? ['.git'] : []
  for (const marker of rawProjectRootMarkers ?? []) {
    if (!isBoundedString(marker, 1024, true)) {
      throw new Error('invalid config/read response')
    }
    projectRootMarkers.push(marker)
  }
  const instructions = config.model_instructions_file
  if (instructions !== null && !isAbsoluteNormalizedPath(instructions)) {
    throw new Error('invalid config/read response')
  }
  const mcpServers = decodeEffectiveMcpServers(config.mcp_servers)
  return Object.freeze({
    projectRootMarkers: Object.freeze(projectRootMarkers),
    globalInstructionsFile: instructions,
    mcpServers,
  })
}

export function decodeNativeContextSkills(
  value: unknown,
  workspace: string,
): readonly CodexEffectiveSkill[] {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['data']) ||
    !Array.isArray(value.data) ||
    value.data.length !== 1
  ) {
    throw new Error('invalid skills/list response')
  }
  const entry = value.data[0]
  if (
    !isJsonObject(entry) ||
    !hasExactKeys(entry, ['cwd', 'errors', 'skills']) ||
    entry.cwd !== workspace ||
    !Array.isArray(entry.errors) ||
    entry.errors.length !== 0 ||
    !Array.isArray(entry.skills) ||
    entry.skills.length > 1024
  ) {
    throw new Error('invalid skills/list response')
  }
  const projected: CodexEffectiveSkill[] = []
  for (const candidate of entry.skills) {
    if (
      !isJsonObject(candidate) ||
      !hasRequiredAllowedKeys(
        candidate,
        [
          'description',
          'enabled',
          'name',
          'path',
          'scope',
        ],
        [
          'dependencies',
          'description',
          'enabled',
          'interface',
          'name',
          'path',
          'scope',
          'shortDescription',
        ],
      ) ||
      !isBoundedString(candidate.name, 256, true) ||
      typeof candidate.enabled !== 'boolean' ||
      !isAbsoluteNormalizedPath(candidate.path) ||
      path.basename(candidate.path) !== 'SKILL.md' ||
      typeof candidate.scope !== 'string' ||
      !SKILL_SCOPES.has(candidate.scope) ||
      !isBoundedString(candidate.description, 16 * 1024, false) ||
      !isOptionalNullable(
        candidate,
        'shortDescription',
        (field) => isBoundedString(field, 16 * 1024, false),
      ) ||
      !isOptionalNullable(
        candidate,
        'dependencies',
        isSkillDependencies,
      ) ||
      !isOptionalNullable(candidate, 'interface', isSkillInterface)
    ) {
      throw new Error('invalid skills/list response')
    }
    if (candidate.scope === 'system') continue
    projected.push(
      Object.freeze({
        name: candidate.name,
        enabled: candidate.enabled,
        sourceRoot: path.dirname(candidate.path),
      }),
    )
  }
  return Object.freeze(projected)
}

export function parseNativeContextJsonLine(line: Buffer): JsonObject {
  let decoded: string
  try {
    decoded = UTF8.decode(line)
  } catch (cause) {
    throw new Error('native context output is not UTF-8', { cause })
  }
  let value: unknown
  try {
    value = JSON.parse(decoded) as unknown
  } catch (cause) {
    throw new Error('native context output is not JSON', { cause })
  }
  if (!isJsonObject(value)) {
    throw new Error('native context output is not an object')
  }
  return value
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(
  value: JsonObject,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  )
}

function hasRequiredAllowedKeys(
  value: JsonObject,
  required: readonly string[],
  allowed: readonly string[],
): boolean {
  const accepted = new Set(allowed)
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => accepted.has(key))
  )
}

function hasAllowedKeys(
  value: JsonObject,
  allowed: readonly string[],
): boolean {
  const accepted = new Set(allowed)
  return Object.keys(value).every((key) => accepted.has(key))
}

function decodeEffectiveMcpServers(
  value: unknown,
): CodexEffectiveConfig['mcpServers'] {
  if (value === undefined || value === null) return Object.freeze([])
  if (!isJsonObject(value) || Object.keys(value).length > 128) {
    throw new Error('invalid config/read response')
  }

  return Object.freeze(
    Object.entries(value)
      .sort(([left], [right]) =>
        left < right ? -1 : left > right ? 1 : 0,
      )
      .map(([name, declaration]) => {
        if (
          !isBoundedString(name, 256, true) ||
          !isJsonObject(declaration)
        ) {
          throw new Error('invalid config/read response')
        }
        const enabled = Object.hasOwn(declaration, 'enabled')
          ? declaration.enabled
          : true
        const required = Object.hasOwn(declaration, 'required')
          ? declaration.required
          : false
        if (
          typeof enabled !== 'boolean' ||
          typeof required !== 'boolean'
        ) {
          throw new Error('invalid config/read response')
        }

        const command = decodeNullableBoundedString(
          declaration.command,
          16 * 1024,
          true,
        )
        const args = decodeBoundedStringList(
          declaration.args,
          128,
          16 * 1024,
          false,
        )
        const envVars = decodeEnvironmentVariables(
          declaration.env_vars,
        )
        const cwd = decodeNullableBoundedString(
          declaration.cwd,
          16 * 1024,
          true,
        )
        const rawToolTimeoutSec = declaration.tool_timeout_sec
        const toolTimeoutSec =
          rawToolTimeoutSec === undefined ||
          rawToolTimeoutSec === null
            ? null
            : rawToolTimeoutSec
        if (
          toolTimeoutSec !== null &&
          (typeof toolTimeoutSec !== 'number' ||
            !Number.isFinite(toolTimeoutSec) ||
            toolTimeoutSec <= 0)
        ) {
          throw new Error('invalid config/read response')
        }
        const env = decodeStaticEnvironment(declaration.env)

        const rawEnabledTools = declaration.enabled_tools
        let enabledTools: readonly string[] | null = null
        if (rawEnabledTools !== undefined && rawEnabledTools !== null) {
          enabledTools = decodeBoundedStringList(
            rawEnabledTools,
            128,
            256,
            true,
          )
        }
        const disabledTools = decodeBoundedStringList(
          declaration.disabled_tools,
          128,
          256,
          true,
        )

        return Object.freeze({
          name,
          command,
          args,
          envVars,
          cwd,
          toolTimeoutSec,
          env,
          enabled,
          required,
          enabledTools,
          disabledTools,
        })
      }),
  )
}

function decodeNullableBoundedString(
  value: unknown,
  maxBytes: number,
  nonempty: boolean,
): string | null {
  if (value === undefined || value === null) return null
  if (!isBoundedString(value, maxBytes, nonempty)) {
    throw new Error('invalid config/read response')
  }
  return value
}

function decodeBoundedStringList(
  value: unknown,
  maxEntries: number,
  maxBytes: number,
  nonempty: boolean,
): readonly string[] {
  if (value === undefined || value === null) return Object.freeze([])
  if (!Array.isArray(value) || value.length > maxEntries) {
    throw new Error('invalid config/read response')
  }
  const projected: string[] = []
  for (const entry of value) {
    if (!isBoundedString(entry, maxBytes, nonempty)) {
      throw new Error('invalid config/read response')
    }
    projected.push(entry)
  }
  return Object.freeze(projected)
}

function decodeStaticEnvironment(
  value: unknown,
): Readonly<Record<string, string>> {
  if (value === undefined || value === null) return Object.freeze({})
  if (!isJsonObject(value) || Object.keys(value).length > 128) {
    throw new Error('invalid config/read response')
  }
  const entries = Object.entries(value).sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  )
  const projected: Array<[string, string]> = []
  for (const [name, staticValue] of entries) {
    if (
      !isBoundedString(name, 256, true) ||
      !isBoundedString(staticValue, 16 * 1024, false)
    ) {
      throw new Error('invalid config/read response')
    }
    projected.push([name, staticValue])
  }
  return Object.freeze(Object.fromEntries(projected))
}

function decodeEnvironmentVariables(
  value: unknown,
): readonly {
  readonly name: string
  readonly source: 'local' | 'remote' | null
}[] {
  if (value === undefined || value === null) return Object.freeze([])
  if (!Array.isArray(value) || value.length > 128) {
    throw new Error('invalid config/read response')
  }
  return Object.freeze(
    value.map((entry) => {
      if (isBoundedString(entry, 256, true)) {
        return Object.freeze({
          name: entry,
          source: null,
        })
      }
      if (
        !isJsonObject(entry) ||
        !Object.keys(entry).every(
          (key) => key === 'name' || key === 'source',
        ) ||
        !isBoundedString(entry.name, 256, true)
      ) {
        throw new Error('invalid config/read response')
      }
      const source =
        entry.source === undefined || entry.source === null
          ? null
          : entry.source
      if (
        source !== null &&
        source !== 'local' &&
        source !== 'remote'
      ) {
        throw new Error('invalid config/read response')
      }
      return Object.freeze({
        name: entry.name,
        source,
      })
    }),
  )
}

function isBoundedString(
  value: unknown,
  maxBytes: number,
  nonempty: boolean,
): value is string {
  return (
    typeof value === 'string' &&
    (!nonempty || value.length > 0) &&
    !hasControlCharacter(value) &&
    Buffer.byteLength(value, 'utf8') <= maxBytes
  )
}

function isAbsoluteNormalizedPath(value: unknown): value is string {
  return (
    isBoundedString(value, 16 * 1024, true) &&
    path.isAbsolute(value) &&
    path.normalize(value) === value
  )
}

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const point = character.codePointAt(0) as number
    if (point < 0x20 || point === 0x7f) return true
  }
  return false
}

function isOptionalNullable(
  value: JsonObject,
  key: string,
  validate: (field: unknown) => boolean,
): boolean {
  if (!Object.hasOwn(value, key)) return true
  const field = value[key]
  return field === null || validate(field)
}

function isSkillInterface(value: unknown): boolean {
  if (
    !isJsonObject(value) ||
    !hasAllowedKeys(value, [
      'brandColor',
      'defaultPrompt',
      'displayName',
      'iconLarge',
      'iconSmall',
      'shortDescription',
    ])
  ) {
    return false
  }
  for (const key of [
    'brandColor',
    'defaultPrompt',
    'displayName',
    'shortDescription',
  ] as const) {
    if (
      !isOptionalNullable(
        value,
        key,
        (field) => isBoundedString(field, 16 * 1024, false),
      )
    ) {
      return false
    }
  }
  for (const key of ['iconLarge', 'iconSmall'] as const) {
    if (!isOptionalNullable(value, key, isAbsoluteNormalizedPath)) {
      return false
    }
  }
  return true
}

function isSkillDependencies(value: unknown): boolean {
  if (
    !isJsonObject(value) ||
    !hasExactKeys(value, ['tools']) ||
    !Array.isArray(value.tools) ||
    value.tools.length > 1024
  ) {
    return false
  }
  return value.tools.every(isSkillToolDependency)
}

function isSkillToolDependency(value: unknown): boolean {
  if (
    !isJsonObject(value) ||
    !hasRequiredAllowedKeys(
      value,
      ['type', 'value'],
      [
        'command',
        'description',
        'transport',
        'type',
        'url',
        'value',
      ],
    ) ||
    !isBoundedString(value.type, 1024, false) ||
    !isBoundedString(value.value, 16 * 1024, false)
  ) {
    return false
  }
  for (const key of [
    'command',
    'description',
    'transport',
    'url',
  ] as const) {
    if (
      !isOptionalNullable(
        value,
        key,
        (field) => isBoundedString(field, 16 * 1024, false),
      )
    ) {
      return false
    }
  }
  return true
}
