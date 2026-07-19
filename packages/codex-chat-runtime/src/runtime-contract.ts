import type {
  CodexAccountReadiness,
  CodexChatRuntime,
  CodexProductActivity,
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
  readonly threadId: string
  readonly skill: CodexProductSkillInput
  readonly text: string
  readonly plan: CodexProductPlanInput
}

export type CodexProductTurn = {
  readonly threadId: string
  readonly turnId: string
  readonly events: AsyncIterable<CodexProductActivity>
}

export type AnswerUserInput = {
  readonly interactionId: string
  readonly answers: Readonly<Record<string, readonly string[]>>
}

export type CancelUserInput = {
  readonly interactionId: string
}

export interface CodexProductCapableRuntime extends CodexChatRuntime {
  readAccountReadiness(): Promise<CodexAccountReadiness>
  startProductTurn(input: StartProductTurnInput): Promise<CodexProductTurn>
  answerUserInput(input: AnswerUserInput): Promise<void>
  cancelUserInput(input: CancelUserInput): Promise<void>
}
