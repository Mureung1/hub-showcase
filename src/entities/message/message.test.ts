import { describe, expect, it } from 'vitest'
import { scenarios, situationCardsFor, toneLabels } from './message'

describe('메시지 도메인 카탈로그', () => {
  it('네 관계에 각각 여섯 개의 상황 카드를 제공한다', () => {
    expect(scenarios).toHaveLength(4)

    for (const scenario of scenarios) {
      expect(situationCardsFor(scenario.id)).toHaveLength(6)
      expect(situationCardsFor(scenario.id)).toContainEqual({ id: 'apologize', label: '답장이 늦었을 때 사과' })
    }
  })

  it('결과 후보의 공통 톤 순서를 고정한다', () => {
    expect(toneLabels).toEqual({
      1: '기본',
      2: '더 부드럽게',
      3: '더 분명하게',
    })
  })
})
