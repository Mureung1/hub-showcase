import type { CodexChatRuntime } from './contract.js'
import {
  startVerifiedCodexChatRuntime,
  type CodexChatRuntimeEnvironment,
} from './runtime.js'
import { verifyProductionBundle } from './production-bundle.js'

export type {
  CodexChatEvent,
  CodexChatRuntime,
  CodexChatThread,
  CodexChatTurn,
  CodexChatTurnErrorCode,
  CodexItemId,
  CodexThreadId,
  CodexTurnId,
  CodexTurnStatus,
  InterruptTurnInput,
  ReleaseThreadInput,
  StartTurnInput,
} from './contract.js'
export { CodexChatRuntimeError } from './errors.js'
export { ProductionBundleVerificationError } from './production-bundle.js'

export interface CreateCodexChatRuntimeOptions {
  readonly runtimeRoot: string
  readonly workspace: string
  readonly environment: CodexChatRuntimeEnvironment
}

export type { CodexChatRuntimeEnvironment } from './runtime.js'

export async function createCodexChatRuntime(
  options: CreateCodexChatRuntimeOptions,
): Promise<CodexChatRuntime> {
  const bundle = await verifyProductionBundle(options.runtimeRoot)
  const spawned = await startVerifiedCodexChatRuntime({
    bundle,
    workspace: options.workspace,
    environment: options.environment,
  })
  return spawned.runtime
}
