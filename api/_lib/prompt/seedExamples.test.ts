import { describe, expect, it } from 'vitest'
import type { ScenarioId } from '../../../src/entities/message'
import type { AiGenerationRequest } from '../generation/provider'
import { buildPromptWithReviewedExamples } from './buildPrompt'
import { reviewedPromptExamplePairs, reviewedPromptExamplesFor } from './seedExamples'

const reviewedScenarioIds = [
  'groupwork',
  'professor',
  'senior',
  'friend',
] as const satisfies readonly ScenarioId[]

describe('reviewedPromptExamplePairs', () => {
  it('검수된 4관계·8세트·24후보를 정확히 제공한다', () => {
    expect(Object.keys(reviewedPromptExamplePairs)).toEqual(reviewedScenarioIds)

    const pairs = reviewedScenarioIds.map((scenarioId) => reviewedPromptExamplesFor(scenarioId))
    expect(pairs.flat()).toHaveLength(8)
    expect(pairs.flatMap((pair) => pair.flatMap((set) => set.candidates))).toHaveLength(24)
  })

  it.each(reviewedScenarioIds)(
    '%s 관계에 답장·먼저 보내기 세트와 톤 1·2·3을 제공한다',
    (scenarioId) => {
      const pair = reviewedPromptExamplesFor(scenarioId)

      expect(pair).toHaveLength(2)
      expect(pair.every((set) => set.scenarioId === scenarioId)).toBe(true)
      expect(pair.filter((set) => set.receivedMessage !== undefined)).toHaveLength(1)
      expect(pair.filter((set) => set.receivedMessage === undefined)).toHaveLength(1)
      expect(pair.map((set) => set.candidates.map((candidate) => candidate.toneLevel))).toEqual([
        [1, 2, 3],
        [1, 2, 3],
      ])
    },
  )

  it('문서에서 승인된 대표 사실과 문구를 보존한다', () => {
    expect(reviewedPromptExamplePairs.groupwork[0].receivedMessage).toBe(
      '미안 나 이번 주 진짜 바빠서 ㅠ 다음 주에 몰아서 할게',
    )
    expect(reviewedPromptExamplePairs.professor[1].candidates[2].text).toContain(
      '진료확인서는 다음 수업 때 제출하겠습니다',
    )
    expect(reviewedPromptExamplePairs.senior[1].candidates[2].text).toContain(
      '과제량이랑 시험 난이도 두 가지만',
    )
    expect(reviewedPromptExamplePairs.friend[0].candidates[2].text).not.toContain('밥 살게')
  })
})

describe('buildPromptWithReviewedExamples', () => {
  it.each(reviewedScenarioIds)(
    '%s 요청에 같은 관계의 검수 예시 2세트를 자동 주입한다',
    (scenarioId) => {
      const request: AiGenerationRequest = {
        scenarioId,
        purpose: 'ask',
        speechStyleId: 'haeyo',
        situation: '현재 요청의 테스트 상황',
      }
      const content = buildPromptWithReviewedExamples(request).messages[0].content
      const currentInput = content.slice(content.indexOf('<current_input>'))

      expect(content.match(/<example_set index=/gu)).toHaveLength(2)
      expect(
        content.match(new RegExp(`<scenario_id>${scenarioId}</scenario_id>`, 'gu')),
      ).toHaveLength(3)
      expect(currentInput).toContain('<situation>현재 요청의 테스트 상황</situation>')
      expect(currentInput).not.toContain('<example_set')
    },
  )
})
