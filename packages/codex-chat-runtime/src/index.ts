import type { CodexProductCapableRuntime } from './runtime-contract.js'
import {
  startVerifiedCodexChatRuntime,
  type CodexChatRuntimeEnvironment,
} from './runtime.js'
import { verifyProductionBundle } from './production-bundle.js'

export type {
  CodexChatEvent,
  CodexAccountReadiness,
  CodexChatRuntime,
  CodexChatRuntimeEvidence,
  CodexChatStatus,
  CodexChatStreamFrame,
  CodexChatThread,
  CodexChatTurnAccepted,
  CodexChatTurn,
  CodexChatTurnErrorCode,
  CodexInteractionId,
  CodexItemId,
  CodexProductActivity,
  CodexThreadId,
  CodexTurnId,
  CodexTurnStatus,
  InterruptTurnInput,
  ReleaseThreadInput,
  StartTurnInput,
} from './contract.js'
export type {
  AnswerUserInput,
  CancelUserInput,
  CodexPrivateMcpServerInput,
  CodexProductCapableRuntime,
  CodexProductSkillInput,
  CodexProductTurn,
  StartThreadInput,
  StartProductTurnInput,
} from './runtime-contract.js'
export {
  CODEX_CHAT_APPROVAL_MODE,
  CODEX_CHAT_SANDBOX,
} from './contract.js'
export { CodexChatRuntimeError } from './errors.js'
export { ProductionBundleVerificationError } from './production-bundle.js'

export interface CreateCodexChatRuntimeOptions {
  readonly runtimeRoot: string
  readonly workspace: string
  readonly environment: CodexChatRuntimeEnvironment
}

export type { CodexChatRuntimeEnvironment } from './runtime.js'

export async function verifyCodexChatRuntimeBundle(
  runtimeRoot: string,
): Promise<import('./contract.js').CodexChatRuntimeEvidence> {
  const bundle = await verifyProductionBundle(runtimeRoot)
  return {
    sourceCommit: bundle.sourceCommit,
    runtimeVersion: bundle.runtimeVersion,
  }
}

export async function createCodexChatRuntime(
  options: CreateCodexChatRuntimeOptions,
): Promise<CodexProductCapableRuntime> {
  const bundle = await verifyProductionBundle(options.runtimeRoot)
  const spawned = await startVerifiedCodexChatRuntime({
    bundle,
    workspace: options.workspace,
    environment: options.environment,
  })
  return spawned.runtime
}
