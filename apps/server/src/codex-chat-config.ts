import { constants as fsConstants } from 'node:fs'
import { access, lstat, realpath } from 'node:fs/promises'
import path from 'node:path'

import {
  createCodexChatRuntime,
  verifyCodexChatRuntimeBundle,
  type CodexChatRuntime,
  type CodexChatRuntimeEnvironment,
  type CodexChatRuntimeEvidence,
  type CodexChatStatus,
} from '@ay-ple/codex-chat-runtime'

const CONFIG_KEYS = [
  'CODEX_CHAT_RUNTIME_ROOT',
  'CODEX_CHAT_WORKSPACE',
  'CODEX_CHAT_RUNTIME_HOME',
  'CODEX_CHAT_CODEX_HOME',
  'CODEX_CHAT_SQLITE_HOME',
  'CODEX_CHAT_TEMP_DIR',
] as const

export type CodexChatUnavailableReason = Extract<
  CodexChatStatus,
  { state: 'unavailable' }
>['reason']

export type CodexChatPreparedRuntime = CodexChatRuntimeEvidence & {
  readonly createRuntime: () => Promise<CodexChatRuntime>
}

export type CodexChatRuntimeSource =
  | {
      readonly kind: 'unavailable'
      readonly reason: CodexChatUnavailableReason
      readonly origin?: string
    }
  | {
      readonly kind: 'prepared'
      readonly prepared: CodexChatPreparedRuntime
      readonly origin?: string
    }
  | {
      readonly kind: 'candidate'
      readonly origin?: string
      readonly prepare: () => Promise<
        | {
            readonly kind: 'prepared'
            readonly prepared: CodexChatPreparedRuntime
          }
        | {
            readonly kind: 'unavailable'
            readonly reason: CodexChatUnavailableReason
          }
      >
    }

export interface CodexChatBootstrap extends CodexChatRuntimeEvidence {
  readonly origin?: string
  readonly createRuntime: () => Promise<CodexChatRuntime>
  /** Test-only operational override. Production uses the five-second bound. */
  readonly disconnectDrainMs?: number
  /** Test-only HTTP writer override. Production uses the five-second bound. */
  readonly httpWriteDrainMs?: number
}

export function resolveCodexChatRuntimeSource(options: {
  readonly bootstrap?: CodexChatBootstrap
  readonly environment: NodeJS.ProcessEnv
}): CodexChatRuntimeSource {
  return options.bootstrap
    ? sourceFromBootstrap(options.bootstrap)
    : sourceFromEnvironment(options.environment)
}

export function isLoopbackAddress(address: string | undefined): boolean {
  if (address === '::1') return true
  const ipv4 = address?.startsWith('::ffff:')
    ? address.slice('::ffff:'.length)
    : address
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(
    ipv4 ?? '',
  )
  if (!match) return false
  return (
    Number(match[1]) === 127 &&
    match.slice(2).every((part) => Number(part) >= 0 && Number(part) <= 255)
  )
}

function sourceFromBootstrap(
  bootstrap: CodexChatBootstrap,
): CodexChatRuntimeSource {
  const origin = canonicalLocalOrigin(bootstrap.origin)
  if (bootstrap.origin !== undefined && origin === undefined) {
    return { kind: 'unavailable', reason: 'invalid_configuration' }
  }
  return {
    kind: 'prepared',
    origin,
    prepared: {
      sourceCommit: bootstrap.sourceCommit,
      runtimeVersion: bootstrap.runtimeVersion,
      createRuntime: bootstrap.createRuntime,
    },
  }
}

function sourceFromEnvironment(
  environment: NodeJS.ProcessEnv,
): CodexChatRuntimeSource {
  const configuredValues = CONFIG_KEYS.map((key) => environment[key])
  const configuredOrigin = environment.CODEX_CHAT_ORIGIN
  const noneConfigured =
    configuredValues.every((value) => value === undefined) &&
    configuredOrigin === undefined
  if (noneConfigured) {
    return { kind: 'unavailable', reason: 'not_configured' }
  }
  if (
    configuredValues.some(
      (value) => value === undefined || value.length === 0 || !path.isAbsolute(value),
    )
  ) {
    return { kind: 'unavailable', reason: 'invalid_configuration' }
  }
  const origin = canonicalLocalOrigin(configuredOrigin)
  if (configuredOrigin !== undefined && origin === undefined) {
    return { kind: 'unavailable', reason: 'invalid_configuration' }
  }

  const [runtimeRoot, workspace, home, codexHome, codexSqliteHome, tempDirectory] =
    configuredValues as [string, string, string, string, string, string]
  const runtimeEnvironment = {
    home,
    codexHome,
    codexSqliteHome,
    tempDirectory,
  } satisfies CodexChatRuntimeEnvironment

  return {
    kind: 'candidate',
    origin,
    prepare: async () => {
      if (!(await validateRuntimePaths(workspace, runtimeEnvironment))) {
        return { kind: 'unavailable', reason: 'invalid_configuration' }
      }
      let evidence: CodexChatRuntimeEvidence
      try {
        evidence = await verifyCodexChatRuntimeBundle(runtimeRoot)
      } catch {
        return { kind: 'unavailable', reason: 'runtime_missing' }
      }
      return {
        kind: 'prepared',
        prepared: {
          ...evidence,
          createRuntime: () =>
            createCodexChatRuntime({
              runtimeRoot,
              workspace,
              environment: runtimeEnvironment,
            }),
        },
      }
    },
  }
}

async function validateRuntimePaths(
  workspace: string,
  environment: CodexChatRuntimeEnvironment,
): Promise<boolean> {
  try {
    const canonicalWorkspace = await validateDirectory(workspace, false)
    const controlled = await Promise.all([
      validateDirectory(environment.home, true),
      validateDirectory(environment.codexHome, true),
      validateDirectory(environment.codexSqliteHome, true),
      validateDirectory(environment.tempDirectory, true),
    ])
    return (
      canonicalWorkspace.length > 0 && new Set(controlled).size === controlled.length
    )
  } catch {
    return false
  }
}

async function validateDirectory(
  directory: string,
  writable: boolean,
): Promise<string> {
  const stats = await lstat(directory)
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new TypeError('Configured path is not a directory')
  }
  await access(
    directory,
    fsConstants.R_OK |
      fsConstants.X_OK |
      (writable ? fsConstants.W_OK : 0),
  )
  return realpath(directory)
}

function canonicalLocalOrigin(origin: string | undefined): string | undefined {
  if (origin === undefined) return undefined
  let parsed: URL
  try {
    parsed = new URL(origin)
  } catch {
    return undefined
  }
  if (
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
    parsed.username.length > 0 ||
    parsed.password.length > 0 ||
    parsed.pathname !== '/' ||
    parsed.search.length > 0 ||
    parsed.hash.length > 0 ||
    parsed.origin !== origin ||
    !isLoopbackHostname(parsed.hostname)
  ) {
    return undefined
  }
  return parsed.origin
}

function isLoopbackHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '[::1]') return true
  return isLoopbackAddress(hostname)
}
