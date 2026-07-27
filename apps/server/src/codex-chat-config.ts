import type {
  CodexChatRuntimeEvidence,
  CodexWorkspaceRuntime,
} from '@ay-ple/codex-chat-runtime'

export type CodexChatUnavailableReason =
  | 'invalid_configuration'
  | 'not_configured'

export type CodexChatPreparedRuntime = CodexChatRuntimeEvidence & {
  readonly createRuntime: () => Promise<CodexWorkspaceRuntime>
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

export interface CodexChatBootstrap extends CodexChatRuntimeEvidence {
  readonly origin?: string
  readonly createRuntime: () => Promise<CodexWorkspaceRuntime>
  /** Test-only operational override. Production uses the five-second bound. */
  readonly disconnectDrainMs?: number
  /** Test-only HTTP writer override. Production uses the five-second bound. */
  readonly httpWriteDrainMs?: number
}

export function resolveCodexChatRuntimeSource(
  bootstrap: CodexChatBootstrap | undefined,
): CodexChatRuntimeSource {
  if (!bootstrap) {
    return { kind: 'unavailable', reason: 'not_configured' }
  }
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
