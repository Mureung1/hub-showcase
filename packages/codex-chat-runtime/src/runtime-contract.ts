import type {
  CodexAccountReadiness,
  CodexChatRuntime,
  CodexInteractionId,
  CodexProductActivity,
  CodexChatThread,
  CodexThreadId,
  CodexTurnId,
} from './contract.js'
import type {
  CodexAccountLifecycle,
  CodexNativeContextPort,
} from './account-contract.js'

export type CodexProductSkillInput = {
  readonly name: string
  readonly path: string
}

export type CodexPrivateMcpServerInput = {
  readonly url: string
  readonly token: string
}

export type CodexProductPermissionProfile =
  | 'read_only'
  | 'workspace_write'

export type CodexModelReasoningEffort = {
  readonly reasoningEffort: string
  readonly description: string
}

export type CodexModelCatalogEntry = {
  readonly model: string
  readonly displayName: string
  readonly description: string
  readonly isDefault: boolean
  readonly defaultReasoningEffort: string
  readonly supportedReasoningEfforts: readonly CodexModelReasoningEffort[]
  readonly serviceTiers: readonly string[]
  readonly defaultServiceTier?: string
}

export type CodexModelCatalog = {
  readonly models: readonly CodexModelCatalogEntry[]
}

export type CodexProductTurnSettings = {
  readonly model: string
  readonly reasoningEffort: string
  readonly serviceTier: 'default' | 'fast'
}

export type StartThreadInput = {
  readonly workspace: string
  readonly mcp: CodexPrivateMcpServerInput
}

export type StartProductTurnInput = {
  readonly threadId: CodexThreadId
  readonly skill?: CodexProductSkillInput
  readonly permissionProfile: CodexProductPermissionProfile
  readonly settings?: CodexProductTurnSettings
  readonly text: string
}

export type CodexProductTurn = {
  readonly threadId: CodexThreadId
  readonly turnId: CodexTurnId
  readonly events: AsyncIterable<CodexProductActivity>
}

export type AnswerUserInput = {
  readonly interactionId: CodexInteractionId
  readonly answers: Readonly<Record<string, readonly string[]>>
}

export type CancelUserInput = {
  readonly interactionId: CodexInteractionId
}

export interface CodexProductCapableRuntime extends CodexChatRuntime {
  startThread(): Promise<CodexChatThread>
  startThread(input: StartThreadInput): Promise<CodexChatThread>
  readAccountReadiness(): Promise<CodexAccountReadiness>
  startProductTurn(input: StartProductTurnInput): Promise<CodexProductTurn>
  answerUserInput(input: AnswerUserInput): Promise<void>
  cancelUserInput(input: CancelUserInput): Promise<void>
}

export interface CodexModelCatalogRuntime {
  readModelCatalog(): Promise<CodexModelCatalog>
}

export interface CodexWorkspaceRuntime
  extends CodexProductCapableRuntime,
    CodexModelCatalogRuntime,
    CodexNativeContextPort {}

export type CodexManagedRuntime =
  CodexWorkspaceRuntime &
  CodexAccountLifecycle
