import type {
  AnswerUserInput,
  CodexProductCapableRuntime,
} from '@ay-ple/codex-chat-runtime'
import type { CodexUserInputQuestion } from '@ay-ple/codex-chat-runtime/contract'

import type {
  AssignmentReviewCommit,
  AssignmentReviewDecisionInput,
  SemesterWorkspaceController,
} from './semester-workspace.js'

export const ASSIGNMENT_REVIEW_QUESTION = {
  id: 'assignment_review_decision',
  header: '변경 제안 검토',
  question: '이 Assignment 변경 제안을 어떻게 처리할까요?',
  options: [
    {
      label: '수락',
      description: '근거와 값을 확인하고 학기 상태에 반영합니다.',
    },
    {
      label: 'AY에게 수정 요청',
      description: '피드백을 전달하고 새 변경 제안을 기다립니다.',
    },
    {
      label: '거절',
      description: '제안을 반영하지 않고 결정 기록만 남깁니다.',
    },
  ],
  acceptsFreeform: true,
} as const satisfies CodexUserInputQuestion

export type AssignmentReviewRuntime = Pick<
  CodexProductCapableRuntime,
  'answerUserInput'
>

export type AssignmentReviewCoordinator = {
  submit(input: AssignmentReviewDecisionInput): Promise<AssignmentReviewCommit>
}

export function createAssignmentReviewCoordinator(
  authority: Pick<SemesterWorkspaceController, 'commitAssignmentReviewDecision'>,
  runtime: AssignmentReviewRuntime,
): AssignmentReviewCoordinator {
  return {
    async submit(input) {
      const commit = await authority.commitAssignmentReviewDecision(input)
      if (!commit.replayed) {
        await runtime.answerUserInput(nativeAnswer(commit))
      }
      return commit
    },
  }
}

export function isExactAssignmentReviewQuestion(
  questions: readonly CodexUserInputQuestion[],
): boolean {
  if (questions.length !== 1) return false
  const question = questions[0]
  if (
    question === undefined ||
    question.id !== ASSIGNMENT_REVIEW_QUESTION.id ||
    question.header !== ASSIGNMENT_REVIEW_QUESTION.header ||
    question.question !== ASSIGNMENT_REVIEW_QUESTION.question ||
    question.acceptsFreeform !== ASSIGNMENT_REVIEW_QUESTION.acceptsFreeform ||
    question.options === null ||
    question.options.length !== ASSIGNMENT_REVIEW_QUESTION.options.length
  ) {
    return false
  }
  return ASSIGNMENT_REVIEW_QUESTION.options.every(
    (expected, index) =>
      question.options?.[index]?.label === expected.label &&
      question.options[index]?.description === expected.description,
  )
}

function nativeAnswer(commit: AssignmentReviewCommit): AnswerUserInput {
  return {
    interactionId: commit.binding.interactionId,
    answers: {
      [ASSIGNMENT_REVIEW_QUESTION.id]: [
        commit.confirmation.decision === 'accepted' ? '수락' : '거절',
      ],
    },
  }
}
