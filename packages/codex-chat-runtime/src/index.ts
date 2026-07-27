import type {
  CodexManagedRuntime,
  CodexWorkspaceRuntime,
} from './runtime-contract.js'
import {
  startVerifiedCodexChatRuntime,
  type CodexChatRuntimeEnvironment,
  type CodexRuntimeApplicationIdentity,
} from './runtime.js'
import { verifyProductionBundle } from './production-bundle.js'

export type {
  CodexAccountFailure,
  CodexAccountFailureCode,
  CodexAccountLifecycle,
  CodexAccountReadResult,
  CodexBrowserLoginAttempt,
  CodexBrowserLoginCancellation,
  CodexBrowserLoginRelease,
  CodexBrowserLoginStartResult,
  CodexEffectiveConfig,
  CodexEffectiveSkill,
  CodexFreshAccount,
  CodexNativeContextPort,
  CodexLogoutResult,
  CodexRuntimeCloseResult,
  CodexRuntimeRole,
} from './account-contract.js'
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
  CodexManagedRuntime,
  CodexPrivateMcpServerInput,
  CodexProductCapableRuntime,
  CodexProductPermissionProfile,
  CodexModelCatalog,
  CodexModelCatalogEntry,
  CodexModelCatalogRuntime,
  CodexModelReasoningEffort,
  CodexProductTurnSettings,
  CodexProductSkillInput,
  CodexProductTurn,
  CodexWorkspaceRuntime,
  StartThreadInput,
  StartProductTurnInput,
} from './runtime-contract.js'
export {
  CODEX_BROWSER_LOGIN_ATTEMPT_TIMEOUT_MS,
  CODEX_BROWSER_LOGIN_OPTIONS,
} from './account-contract.js'
export {
  CODEX_CHAT_APPROVAL_MODE,
  CODEX_CHAT_SANDBOX,
} from './contract.js'
export { CodexChatRuntimeError } from './errors.js'
export { ProductionBundleVerificationError } from './production-bundle.js'

export interface CreateCodexChatRuntimeOptions {
  readonly runtimeRoot: string
  readonly role: import('./account-contract.js').CodexRuntimeRole
  readonly application: CodexRuntimeApplicationIdentity
  readonly environment: CodexChatRuntimeEnvironment
}

export interface CreateCodexChatWorkspaceRuntimeOptions {
  readonly runtimeRoot: string
  readonly workspace: string
  readonly environment: CodexChatRuntimeEnvironment
}

export type {
  CodexChatRuntimeEnvironment,
  CodexRuntimeApplicationIdentity,
} from './runtime.js'

export async function verifyCodexChatRuntimeBundle(
  runtimeRoot: string,
): Promise<import('./contract.js').CodexChatRuntimeEvidence> {
  const bundle = await verifyProductionBundle(runtimeRoot)
  return {
    sourceCommit: bundle.sourceCommit,
    runtimeVersion: bundle.runtimeVersion,
  }
}

export function createCodexChatRuntime(
  options: CreateCodexChatRuntimeOptions,
): Promise<CodexManagedRuntime>
export function createCodexChatRuntime(
  options: CreateCodexChatWorkspaceRuntimeOptions,
): Promise<CodexWorkspaceRuntime>
export async function createCodexChatRuntime(
  options:
    | CreateCodexChatRuntimeOptions
    | CreateCodexChatWorkspaceRuntimeOptions,
): Promise<CodexManagedRuntime> {
  const bundle = await verifyProductionBundle(options.runtimeRoot)
  const spawned =
    'role' in options
      ? await startVerifiedCodexChatRuntime({
          bundle,
          role: options.role,
          application: options.application,
          environment: options.environment,
        })
      : await startVerifiedCodexChatRuntime({
          bundle,
          workspace: options.workspace,
          environment: options.environment,
        })
  return spawned.runtime
}
