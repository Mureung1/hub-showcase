import type { CodexWorkspaceRuntime } from './runtime-contract.js'
import {
  startVerifiedCodexChatRuntime,
  type CodexChatRuntimeEnvironment,
} from './runtime.js'
import { verifyProductionBundle } from './production-bundle.js'

export type {
  CodexEffectiveConfig,
  CodexEffectiveSkill,
  CodexNativeContextPort,
} from './native-context-contract.js'
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
  CodexChildEnvironment,
  CodexProductCapableRuntime,
  CodexProductPermissionProfile,
  CodexModelCatalog,
  CodexModelCatalogEntry,
  CodexModelCatalogRuntime,
  CodexMcpReadinessPort,
  CodexModelReasoningEffort,
  CodexProductTurnSettings,
  CodexProductTurn,
  CodexWorkspaceRuntime,
  StartProductTurnInput,
} from './runtime-contract.js'
export {
  CODEX_CHAT_APPROVAL_MODE,
  CODEX_CHAT_SANDBOX,
} from './contract.js'
export { CodexChatRuntimeError } from './errors.js'
export { ProductionBundleVerificationError } from './production-bundle.js'

export interface CreateCodexChatWorkspaceRuntimeOptions {
  readonly runtimeRoot: string
  readonly workspace: string
  readonly environment: CodexChatRuntimeEnvironment
  readonly childEnvironment?: import('./runtime-contract.js').CodexChildEnvironment
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
  options: CreateCodexChatWorkspaceRuntimeOptions,
): Promise<CodexWorkspaceRuntime> {
  const bundle = await verifyProductionBundle(options.runtimeRoot)
  const spawned = await startVerifiedCodexChatRuntime({
    bundle,
    workspace: options.workspace,
    environment: options.environment,
    childEnvironment: options.childEnvironment,
  })
  return spawned.runtime
}
