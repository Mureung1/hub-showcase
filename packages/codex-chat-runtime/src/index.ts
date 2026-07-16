import type { CodexChatRuntime } from './contract.js'
import { startVerifiedCodexChatRuntime } from './runtime.js'
import { verifyProductionBundle } from './production-bundle.js'

export type {
  CodexChatEvent,
  CodexChatRuntime,
  CodexChatThread,
  CodexChatTurn,
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
}

export async function createCodexChatRuntime(
  options: CreateCodexChatRuntimeOptions,
): Promise<CodexChatRuntime> {
  const bundle = await verifyProductionBundle(options.runtimeRoot)
  const spawned = await startVerifiedCodexChatRuntime({
    bundle,
    workspace: options.workspace,
  })
  return spawned.runtime
}
