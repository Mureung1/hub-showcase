import { constants as fsConstants } from 'node:fs'
import { access, lstat, mkdir, realpath } from 'node:fs/promises'
import path from 'node:path'

import {
  createCodexChatRuntime,
  verifyCodexChatRuntimeBundle,
  type CodexChatRuntime,
  type CodexChatRuntimeEnvironment,
  type CodexChatRuntimeEvidence,
} from '@ay-ple/codex-chat-runtime'

import { rootsAreDisjoint } from './root-isolation.js'

export type CodexChatUnavailableReason =
  | 'invalid_configuration'
  | 'not_configured'
  | 'runtime_missing'

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

export interface ProductRuntimeBootstrap {
  readonly appDataRoot: string
  readonly runtimeRoot: string
  readonly environment: CodexChatRuntimeEnvironment
  readonly origin: string
}

export function resolveCodexChatRuntimeSource(options: {
  readonly bootstrap?: CodexChatBootstrap
  readonly productRuntime?: ProductRuntimeBootstrap
  readonly workspace?: () => string
}): CodexChatRuntimeSource {
  if (options.bootstrap) return sourceFromBootstrap(options.bootstrap)
  if (options.productRuntime && options.workspace) {
    return sourceFromProductRuntime(options.productRuntime, options.workspace)
  }
  return { kind: 'unavailable', reason: 'not_configured' }
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

function sourceFromProductRuntime(
  productRuntime: ProductRuntimeBootstrap,
  workspace: () => string,
): CodexChatRuntimeSource {
  if (
    !path.isAbsolute(productRuntime.appDataRoot) ||
    !path.isAbsolute(productRuntime.runtimeRoot) ||
    Object.values(productRuntime.environment).some(
      (value) => value.length === 0 || !path.isAbsolute(value),
    )
  ) {
    return { kind: 'unavailable', reason: 'invalid_configuration' }
  }
  const origin = canonicalLocalOrigin(productRuntime.origin)
  if (origin === undefined) {
    return { kind: 'unavailable', reason: 'invalid_configuration' }
  }

  return {
    kind: 'candidate',
    origin,
    prepare: async () => {
      let evidence: CodexChatRuntimeEvidence
      try {
        evidence = await verifyCodexChatRuntimeBundle(productRuntime.runtimeRoot)
      } catch {
        return { kind: 'unavailable', reason: 'runtime_missing' }
      }
      try {
        await ensureManagedRuntimeDirectories(productRuntime)
      } catch {
        return { kind: 'unavailable', reason: 'invalid_configuration' }
      }
      return {
        kind: 'prepared',
        prepared: {
          ...evidence,
          createRuntime: async () => {
            const activeWorkspace = workspace()
            if (
              !(await validateRuntimePaths(
                activeWorkspace,
                productRuntime.environment,
              ))
            ) {
              throw new TypeError('Product Runtime paths are not isolated')
            }
            return createCodexChatRuntime({
              runtimeRoot: productRuntime.runtimeRoot,
              workspace: activeWorkspace,
              environment: productRuntime.environment,
            })
          },
        },
      }
    },
  }
}

async function ensureManagedRuntimeDirectories(
  productRuntime: ProductRuntimeBootstrap,
): Promise<void> {
  const appDataRoot = await validateDirectory(productRuntime.appDataRoot, true)
  for (const directory of Object.values(productRuntime.environment)) {
    const relative = path.relative(productRuntime.appDataRoot, directory)
    if (
      relative.length === 0 ||
      path.isAbsolute(relative) ||
      relative === '..' ||
      relative.startsWith(`..${path.sep}`)
    ) {
      throw new TypeError('Runtime state must be below appDataRoot')
    }
    let current = productRuntime.appDataRoot
    for (const segment of relative.split(path.sep)) {
      current = path.join(current, segment)
      try {
        await mkdir(current, { mode: 0o700 })
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      }
      const canonical = await validateDirectory(current, true)
      const canonicalRelative = path.relative(appDataRoot, canonical)
      if (
        canonicalRelative === '..' ||
        canonicalRelative.startsWith(`..${path.sep}`) ||
        path.isAbsolute(canonicalRelative)
      ) {
        throw new TypeError('Runtime state escaped appDataRoot')
      }
    }
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
    return rootsAreDisjoint([canonicalWorkspace, ...controlled])
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
