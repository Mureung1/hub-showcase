import type {
  CodexAccountReadiness,
  CodexChatRuntime,
  CodexInteractionId,
  CodexProductActivity,
  CodexThreadId,
  CodexTurnId,
} from './contract.js'

export type CodexProductSkillInput = {
  readonly name: string
  readonly path: string
}

export type CodexProductPlanInput = {
  readonly model: string
  readonly reasoningEffort: string
}

export type StartProductTurnInput = {
  readonly threadId: CodexThreadId
  readonly skill?: CodexProductSkillInput
  readonly text: string
  readonly plan: CodexProductPlanInput
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
  readAccountReadiness(): Promise<CodexAccountReadiness>
  startProductTurn(input: StartProductTurnInput): Promise<CodexProductTurn>
  answerUserInput(input: AnswerUserInput): Promise<void>
  cancelUserInput(input: CancelUserInput): Promise<void>
}
