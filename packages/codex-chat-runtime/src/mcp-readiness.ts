import {
  MCP_SERVER_NOT_READY_MESSAGE,
  MCP_SERVER_TOOLS_MISMATCH_MESSAGE,
  RUNTIME_OPERATION_ABORTED_MESSAGE,
  CodexChatRuntimeError,
} from './errors.js'
import type { CodexMcpReadinessPort } from './runtime-contract.js'

type CodexMcpReadinessInput = Parameters<
  CodexMcpReadinessPort['waitForMcpServerReady']
>[0]

export function requireMcpReadinessInput(
  input: unknown,
): asserts input is CodexMcpReadinessInput {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError('MCP readiness input must be an object')
  }
  const actualKeys = Object.keys(input).sort()
  const expectedKeys = [
    'expectedTools',
    'serverName',
    'signal',
    'threadId',
  ]
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new TypeError('MCP readiness input fields are invalid')
  }

  const { expectedTools, serverName, signal, threadId } =
    input as Record<string, unknown>
  requireBoundedString(threadId, 'MCP thread ID', 1024)
  requireBoundedString(serverName, 'MCP server name', 256)
  if (
    !Array.isArray(expectedTools) ||
    expectedTools.length === 0 ||
    expectedTools.length > 128
  ) {
    throw new TypeError('MCP expected tool roster is invalid')
  }
  for (const tool of expectedTools) {
    requireBoundedString(tool, 'MCP tool name', 256)
  }
  if (new Set(expectedTools).size !== expectedTools.length) {
    throw new TypeError('MCP expected tool roster is invalid')
  }
  requireAbortSignal(signal)
}

export async function abortableMcpReadinessOperation<T>(
  operation: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  let rejectAbort!: (error: CodexChatRuntimeError) => void
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectAbort = reject
  })
  const onAbort = () => rejectAbort(mcpReadinessAbortedError())
  signal.addEventListener('abort', onAbort, { once: true })
  if (signal.aborted) onAbort()
  try {
    return await Promise.race([operation, aborted])
  } finally {
    signal.removeEventListener('abort', onAbort)
  }
}

export function sameMcpToolRoster(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  const sortedActual = [...actual].sort()
  const sortedExpected = [...expected].sort()
  return (
    sortedActual.length === sortedExpected.length &&
    sortedActual.every((value, index) => value === sortedExpected[index])
  )
}

export function mcpServerNotReadyError(): CodexChatRuntimeError {
  return new CodexChatRuntimeError({
    code: 'mcp_server_not_ready',
    displayMessage: MCP_SERVER_NOT_READY_MESSAGE,
    unknownOutcome: false,
  })
}

export function mcpServerToolsMismatchError(): CodexChatRuntimeError {
  return new CodexChatRuntimeError({
    code: 'mcp_server_tools_mismatch',
    displayMessage: MCP_SERVER_TOOLS_MISMATCH_MESSAGE,
    unknownOutcome: false,
  })
}

export function mcpReadinessAbortedError(): CodexChatRuntimeError {
  return new CodexChatRuntimeError({
    code: 'runtime_operation_aborted',
    displayMessage: RUNTIME_OPERATION_ABORTED_MESSAGE,
    unknownOutcome: false,
  })
}

function requireAbortSignal(value: unknown): asserts value is AbortSignal {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as AbortSignal).aborted !== 'boolean' ||
    typeof (value as AbortSignal).addEventListener !== 'function' ||
    typeof (value as AbortSignal).removeEventListener !== 'function'
  ) {
    throw new TypeError('Abort signal is invalid')
  }
}

function requireBoundedString(
  value: unknown,
  label: string,
  maxBytes: number,
): asserts value is string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    Buffer.byteLength(value, 'utf8') > maxBytes
  ) {
    throw new TypeError(`${label} is invalid`)
  }
}
