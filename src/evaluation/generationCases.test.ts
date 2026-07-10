import { describe, expect, it } from 'vitest'
import { evaluationCases } from './generationCases'

describe('AI 품질 평가 케이스', () => {
  it('교수님·조교님·선배·친구 관계를 모두 포함한다', () => {
    expect(evaluationCases.map((evaluationCase) => evaluationCase.relationship)).toEqual(
      expect.arrayContaining(['교수님', '조교님', '선배·동기', '친구·연인']),
    )
  })

  it('각 사례에 평가 가능한 기대 규칙과 입력 맥락이 있다', () => {
    for (const evaluationCase of evaluationCases) {
      expect(evaluationCase.situation.trim()).not.toHaveLength(0)
      expect(evaluationCase.expectedRules.length).toBeGreaterThanOrEqual(4)
      if (evaluationCase.mode === 'reply') {
        expect(evaluationCase.receivedMessage?.trim()).not.toHaveLength(0)
      }
    }
  })
})
