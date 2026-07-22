import { describe, expect, it } from 'vitest'
import type { ScenarioId } from '../entities/message'
import { reviewedPromptExampleCatalog } from '../../api/_lib/prompt/seedExamples'
import { evaluationCases } from './generationCases'

const scenarioIds: readonly ScenarioId[] = ['groupwork', 'professor', 'senior', 'friend']

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

  it('SPEC 5장 holdout 규모(20개, 시나리오당 5개)를 만족한다', () => {
    expect(evaluationCases).toHaveLength(20)
    for (const scenarioId of scenarioIds) {
      expect(evaluationCases.filter((c) => c.scenarioId === scenarioId)).toHaveLength(5)
    }
  })

  it('시나리오마다 거절(decline)·500자 근접 입력 케이스를 최소 1개씩 포함한다', () => {
    for (const scenarioId of scenarioIds) {
      const scenarioCases = evaluationCases.filter((c) => c.scenarioId === scenarioId)
      expect(scenarioCases.some((c) => c.purpose === 'decline')).toBe(true)
      expect(
        scenarioCases.some((c) => {
          const longest = Math.max(c.situation.length, c.receivedMessage?.length ?? 0)
          return longest >= 400 && c.riskCategories?.includes('length_boundary')
        }),
      ).toBe(true)
    }
  })

  it('상충 지시·강압 요청·사실 추가 위험 위험군을 최소 1개씩 포함한다', () => {
    const allCategories = evaluationCases.flatMap((c) => c.riskCategories ?? [])
    expect(allCategories).toEqual(
      expect.arrayContaining(['conflicting_instruction', 'coercive_request', 'fabrication_risk']),
    )
  })

  it('시드 24개와 situation·receivedMessage 문구가 겹치지 않는다', () => {
    const seedTexts = new Set(
      reviewedPromptExampleCatalog.flatMap((seed) =>
        [seed.situation, seed.receivedMessage].filter((value): value is string => Boolean(value)),
      ),
    )

    for (const evaluationCase of evaluationCases) {
      expect(seedTexts.has(evaluationCase.situation)).toBe(false)
      if (evaluationCase.receivedMessage) {
        expect(seedTexts.has(evaluationCase.receivedMessage)).toBe(false)
      }
    }
  })
})
