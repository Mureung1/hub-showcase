import { describe, expect, it } from 'vitest'
import { scenarios, situationCardsFor } from './message'
import {
  guidedContextQuestionFor,
  guidedContextQuestions,
  hasCompleteGuidedContextCoverage,
  resolveGuidedContext,
} from './guidedContext'

describe('guided 맥락 카탈로그', () => {
  it('4관계 × 6카드에 질문 1개와 빠른 답변 3개를 제공한다', () => {
    expect(guidedContextQuestions).toHaveLength(24)
    expect(hasCompleteGuidedContextCoverage()).toBe(true)

    for (const scenario of scenarios) {
      for (const card of situationCardsFor(scenario.id)) {
        const question = guidedContextQuestionFor(scenario.id, card.id)
        expect(question?.options).toHaveLength(3)
        expect(new Set(question?.options.map((option) => option.id))).toHaveProperty('size', 3)
      }
    }
  })

  it('질문·option ID를 서버 정본 사실로 해석한다', () => {
    expect(
      resolveGuidedContext('friend', 'express_feelings', [
        {
          questionId: 'cq.friend.express_feelings.focus',
          optionId: 'co.friend.express_feelings.express_hurt',
        },
      ]),
    ).toEqual({
      catalogVersion: 'guided-context-v1',
      purposeId: 'other',
      promptFacts: ['서운한 마음을 전한다. 상대 잘못, 원인, 이별 의사는 만들지 않는다.'],
      questionIds: ['cq.friend.express_feelings.focus'],
      optionIds: ['co.friend.express_feelings.express_hurt'],
    })
  })

  it('누락·추가·다른 관계의 답변을 거절한다', () => {
    expect(resolveGuidedContext('friend', 'schedule', [])).toBeNull()
    expect(
      resolveGuidedContext('friend', 'schedule', [
        { questionId: 'cq.friend.schedule.focus', optionId: 'co.friend.schedule.ask_availability' },
        { questionId: 'cq.friend.schedule.focus', optionId: 'co.friend.schedule.choose_together' },
      ]),
    ).toBeNull()
    expect(
      resolveGuidedContext('friend', 'schedule', [
        { questionId: 'cq.groupwork.schedule.focus', optionId: 'co.groupwork.schedule.ask_availability' },
      ]),
    ).toBeNull()
  })
})
